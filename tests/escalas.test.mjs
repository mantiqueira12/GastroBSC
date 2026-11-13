import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ctx = {};
vm.runInNewContext(fs.readFileSync('dist/assets/js/escalas-calc.js', 'utf8'), ctx);
const api = ctx.GBSC_Escalas;
const fixture = () => ({
  opening: Array.from({length:7}, () => ({active:true,start:'08:00',end:'20:00'})),
  bands: [{name:'Serviço',start:'08:00',end:'20:00'}],
  roles: [{name:'Cozinha',count:2,currentHours:40,mixed:'4x3',fixedStart:'',demand:Array.from({length:7},()=>[1])}],
  breakMinutes:60, restHours:11, consecutive:false
});
test('4x3 é 40h efetivas; pausa aumenta permanência e não cobre demanda', () => {
  const r=api.simulate(fixture(),'4x3');
  assert.equal(r.targetHours,80);
  assert.ok(r.assignments.length>0);
  for (const a of r.assignments) {
    assert.equal(a.shifts.length,4);
    for(const s of a.shifts){
      assert.equal(s.end-s.start,22);
      assert.equal(s.workSlots.length,20);
      for(let k=s.breakStart;k<s.breakStart+2;k++)assert.ok(!s.workSlots.includes(k));
    }
  }
});
test('5x2 usa 5 dias de 8h e demanda total não muda entre modelos',()=>{
  const x=fixture(),a=api.simulate(x,'5x2'),b=api.simulate(x,'4x3');
  assert.equal(a.requiredHours,b.requiredHours);
  for(const p of a.assignments) {assert.equal(p.shifts.length,5);for(const s of p.shifts)assert.equal(s.workSlots.length,16);}
});
test('funções não se cobrem entre si e demanda é verificável por meia hora',()=>{
  const x=fixture();x.roles[0].count=0;x.roles.push({...x.roles[0],name:'Salão',count:4,demand:Array.from({length:7},()=>[0])});
  const r=api.simulate(x,'5x2');assert.equal(r.coveredHours,0);assert.equal(r.shortageHours,84);
});
test('jornada cruza meia-noite sem encurtar nem alocar duas vezes o mesmo slot',()=>{
  const x=fixture();x.opening.forEach(d=>{d.start='18:00';d.end='05:00';});x.bands=[{name:'Noite',start:'18:00',end:'05:00'}];
  const r=api.simulate(x,'4x3');assert.equal(r.requiredHours,77);
  assert.ok(r.assignments.length>0);
  for(const a of r.assignments){assert.equal(new Set(a.shifts.flatMap(s=>s.workSlots)).size,80);}
});
test('descanso entre turnos é conferido inclusive na virada da semana',()=>{
  const r=api.simulate(fixture(),'4x3');
  for(const a of r.assignments){const z=a.shifts;for(let i=0;i<z.length;i++){const next=z[(i+1)%z.length].start+(i===z.length-1?336:0);assert.ok(next-z[i].end>=22);}}
});
test('não amplia contrato abaixo de 40h para preencher o cenário',()=>{
  const x=fixture();x.roles[0].currentHours=30;const r=api.simulate(x,'4x3');assert.equal(r.assignments.length,0);assert.ok(r.warnings.length>0);
});
test('sem janela de 11h, 4x10 + pausa de 1h não é encaixado',()=>{
  const x=fixture();x.opening.forEach(d=>{d.end='18:00';});x.bands[0].end='18:00';const r=api.simulate(x,'4x3');assert.equal(r.assignments.length,0);assert.equal(r.coveredHours,0);
});
test('modelo misto respeita a escolha por função e folgas consecutivas',()=>{
  const x=fixture();x.consecutive=true;x.roles.push({...x.roles[0],name:'Salão',mixed:'5x2'});const r=api.simulate(x,'mixed');
  for(const a of r.assignments){assert.equal(a.shifts.length,a.roleIndex===0?4:5);const days=new Set(a.shifts.map(s=>Math.floor(s.start/48)));let max=0,run=0;for(let i=0;i<14;i++){run=days.has(i%7)?0:run+1;max=Math.max(max,run);}assert.ok(max>=(a.roleIndex===0?3:2));}
});
test('rejeita horários ambíguos, sobreposição de períodos e demanda fora da abertura',()=>{
  const x=fixture();x.opening[0].end='08:00';assert.ok(api.validate(x).length);
  const y=fixture();y.bands.push({...y.bands[0]});y.roles[0].demand.forEach(d=>d.push(1));assert.ok(api.validate(y).length);
  const z=fixture();z.opening[0].end='18:00';assert.ok(api.validate(z).length);
});
test('resultado é determinístico e preserva entrada; cobertura fecha com lacunas',()=>{
  const x=fixture(),before=JSON.stringify(x);const a=api.simulate(x,'5x2'),b=api.simulate(x,'5x2');assert.equal(JSON.stringify(a),JSON.stringify(b));assert.equal(JSON.stringify(x),before);assert.equal(a.coveredHours+a.shortageHours,a.requiredHours);
  assert.ok(a.coveredHours<=a.scheduledHours);
});
test('janelas que atravessam a madrugada não podem sobrepor o próximo dia',()=>{
  const x=fixture();x.opening[0]={active:true,start:'18:00',end:'05:00'};x.opening[1]={active:true,start:'04:00',end:'20:00'};
  x.roles[0].demand[0]=[0];assert.ok(api.validate(x).some(e=>e.includes('sobrep')));
});
test('página permite resultado sem cadastro e contato não leva dados operacionais',()=>{
  const html=fs.readFileSync('dist/simulador-escalas-restaurante.html','utf8');
  assert.ok(!/<form\b|type="email"|type="tel"|style=|on(?:click|change|input)=/.test(html));
  assert.ok(html.includes('sim-results')&&html.includes('Sem cadastro'));
  for(const [,url] of html.matchAll(/href="(https:\/\/wa.me\/[^\"]+)"/g)){
    const u=new URL(url);assert.equal(u.pathname,'/5512997710040');assert.equal([...u.searchParams.keys()].join(','),'text');
    assert.ok(!/08:00|23:00|Cozinha|salário/.test(u.searchParams.get('text')));
  }
  const ui=fs.readFileSync('dist/assets/js/escalas.js','utf8');
  assert.ok(!/localStorage|sessionStorage|document\.cookie|\bfetch\s*\(|sendBeacon|XMLHttpRequest/.test(ui));
});
