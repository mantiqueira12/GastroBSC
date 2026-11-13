(function () {
  'use strict';
  var days=['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];
  var shortDays=['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
  var bands=[['Preparo','08:00','11:00'],['Almoço','11:00','15:00'],['Entre serviços','15:00','18:00'],['Jantar','18:00','22:00'],['Fechamento','22:00','23:00']];
  var roleData=['Cozinha','Salão','Caixa'].map(function(name){return {name:name,count:'',currentHours:40,mixed:'5x2',fixedStart:'',demand:days.map(function(){return bands.map(function(){return 0;});})};});
  var step=0,results=null,input=null,example=false;
  var $=function(id){return document.getElementById(id);};
  function esc(t){return String(t).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function field(id,label,type,value,attrs){return '<label for="'+id+'">'+label+'</label><input id="'+id+'" type="'+type+'" value="'+esc(value)+'" '+(attrs||'')+'>';}
  function renderOpening(){
    $('opening-rows').innerHTML=days.map(function(name,d){return '<tr><th scope="row"><label><input id="open-'+d+'" type="checkbox" checked> '+name+'</label></th><td>'+field('start-'+d,'Início '+name,'time','08:00','step="1800"')+'</td><td>'+field('end-'+d,'Fim '+name,'time','23:00','step="1800"')+'</td></tr>';}).join('');
  }
  function renderBands(){
    $('band-rows').innerHTML=bands.map(function(b,i){return '<div class="sim-band"><div>'+field('band-name-'+i,'Período '+(i+1),'text',b[0],'maxlength="40" required')+'</div><div>'+field('band-start-'+i,'Início','time',b[1],'step="1800" required')+'</div><div>'+field('band-end-'+i,'Fim','time',b[2],'step="1800" required')+'</div></div>';}).join('');
  }
  function readBands(){bands=bands.map(function(b,i){return [$('band-name-'+i).value.trim(),$('band-start-'+i).value,$('band-end-'+i).value];});}
  function renderRoles(){
    $('role-rows').innerHTML=roleData.map(function(r,i){return '<fieldset class="sim-role"><legend>Função '+(i+1)+'</legend><div class="sim-fields"><div>'+field('role-name-'+i,'Nome da função','text',r.name,'maxlength="50" required')+'</div><div>'+field('role-count-'+i,'Pessoas nessa função','number',r.count,'min="0" max="30" step="1" required')+'</div><div>'+field('role-hours-'+i,'Horas semanais atuais por pessoa','number',r.currentHours,'min="1" max="60" step="0.5" required')+'</div><div><label for="role-model-'+i+'">No modelo misto</label><select id="role-model-'+i+'"><option value="5x2"'+(r.mixed==='5x2'?' selected':'')+'>5×2 · 8h por dia</option><option value="4x3"'+(r.mixed==='4x3'?' selected':'')+'>4×3 · 10h por dia</option></select></div><div>'+field('role-fixed-'+i,'Entrada fixa do grupo (opcional)','time',r.fixedStart,'step="1800"')+'<small>Em branco: testar entradas diferentes.</small></div></div></fieldset>';}).join('');
  }
  function readRoles(){roleData.forEach(function(r,i){r.name=$('role-name-'+i).value.trim();r.count=$('role-count-'+i).value;r.currentHours=Number($('role-hours-'+i).value);r.mixed=$('role-model-'+i).value;r.fixedStart=$('role-fixed-'+i).value;});}
  function readDemand(){if(!$('need-0-0-0'))return;roleData.forEach(function(r,i){r.demand=days.map(function(_,d){return bands.map(function(_,b){var el=$('need-'+i+'-'+d+'-'+b);return el?Number(el.value):0;});});});}
  function renderDemand(){
    $('demand-rows').innerHTML=roleData.map(function(r,i){return '<section class="sim-demand-role"><h3>'+esc(r.name)+'</h3><div class="sim-table-scroll" tabindex="0" role="region" aria-label="Necessidade da função '+esc(r.name)+'"><table class="sim-table"><caption>Pessoas trabalhando ao mesmo tempo · '+esc(r.name)+'</caption><thead><tr><th scope="col">Dia</th>'+bands.map(function(b){return '<th scope="col">'+esc(b[0])+'<small>'+esc(b[1])+'–'+esc(b[2])+'</small></th>';}).join('')+'</tr></thead><tbody>'+days.map(function(day,d){var active=$('open-'+d).checked;return '<tr><th scope="row">'+day+(active?'':' · fechado')+'</th>'+bands.map(function(b,j){var v=r.demand[d]&&r.demand[d][j]||0;return '<td><label class="sr-only" for="need-'+i+'-'+d+'-'+j+'">'+esc(r.name)+' · '+day+' · '+esc(b[0])+'</label><input id="need-'+i+'-'+d+'-'+j+'" type="number" min="0" max="30" step="1" value="'+v+'"'+(active?'':' disabled')+' required></td>';}).join('')+'</tr>';}).join('')+'</tbody></table></div><button type="button" class="sim-minor" data-repeat="'+i+'">Repetir valores do primeiro dia aberto nos demais dias abertos</button></section>';}).join('');
  }
  function showStep(n,focus){step=n;document.querySelectorAll('.sim-step').forEach(function(el,i){el.hidden=i!==n;});document.querySelectorAll('.sim-progress li').forEach(function(el,i){if(i===n)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});$('sim-prev').hidden=n===0;$('sim-next').textContent=n===3?'Comparar minhas opções':'Continuar';$('sim-errors').hidden=true;if(focus!==false)$('step-title-'+n).focus();}
  function validStep(){
    var fields=document.querySelectorAll('#step-'+step+' input:not(:disabled), #step-'+step+' select');
    for(var i=0;i<fields.length;i++){if(!fields[i].reportValidity())return false;}return true;
  }
  function readInput(){
    readBands();readRoles();readDemand();
    return {opening:days.map(function(_,d){return {active:$('open-'+d).checked,start:$('start-'+d).value,end:$('end-'+d).value};}),bands:bands.map(function(b){return {name:b[0],start:b[1],end:b[2]};}),roles:roleData.map(function(r){return {name:r.name,count:Number(r.count),currentHours:r.currentHours,mixed:r.mixed,fixedStart:r.fixedStart,demand:r.demand};}),breakMinutes:Number($('sim-break').value),restHours:Number($('sim-rest').value),consecutive:$('sim-consecutive').checked};
  }
  function errors(list){$('sim-errors').innerHTML='<h3>Confira estes pontos para simular</h3><ul>'+list.map(function(t){return '<li>'+esc(t)+'</li>';}).join('')+'</ul>';$('sim-errors').hidden=false;$('sim-errors').focus();}
  function num(n){return n.toLocaleString('pt-BR',{maximumFractionDigits:1});}
  function label(model){return model==='4x3'?'4×3 · 10h/dia':model==='5x2'?'5×2 · 8h/dia':'Misto por função';}
  function timeLabel(slot){var k=((slot%48)+48)%48;return String(Math.floor(k/2)).padStart(2,'0')+':'+(k%2?'30':'00');}
  function renderDetail(model){
    var r=results[model];
    $('sim-detail-title').textContent='Cobertura simulada: '+label(model);
    document.querySelectorAll('[data-result-model]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.resultModel===model));});
    $('sim-warnings').innerHTML=r.warnings.length?'<h4>Pontos que precisam de atenção</h4><ul>'+r.warnings.map(function(w){return '<li>'+esc(w)+'</li>';}).join('')+'</ul>':'';
    $('sim-grid').innerHTML=input.roles.map(function(role,i){return '<section class="sim-demand-role"><h4>'+esc(role.name)+'</h4><div class="sim-table-scroll" tabindex="0" role="region" aria-label="Cobertura de '+esc(role.name)+'"><table class="sim-table sim-coverage"><caption>Menor cobertura no período / pessoas necessárias · '+esc(role.name)+'</caption><thead><tr><th scope="col">Dia</th>'+input.bands.map(function(b){return '<th scope="col">'+esc(b.name)+'<small>'+esc(b.start)+'–'+esc(b.end)+'</small></th>';}).join('')+'</tr></thead><tbody>'+days.map(function(day,d){return '<tr><th scope="row">'+day+'</th>'+input.bands.map(function(_,bi){var cell=r.cells.find(function(c){return c.roleIndex===i&&c.day===d&&c.band===bi;});if(!cell||!cell.needed)return '<td>—</td>';return '<td class="'+(cell.shortageHours?'sim-gap':'sim-ok')+'"><strong>'+cell.minCoverage+' / '+cell.needed+'</strong><small>'+(cell.shortageHours?num(cell.shortageHours)+'h sem cobertura':'Coberto neste ensaio')+'</small></td>';}).join('')+'</tr>';}).join('')+'</tbody></table></div></section>';}).join('');
    var groups={};r.assignments.forEach(function(a){a.shifts.forEach(function(s){var day=Math.floor(s.start/48),key=[a.roleIndex,day,s.start,s.end,s.breakStart].join('_');if(!groups[key])groups[key]={role:a.roleIndex,day:day,shift:s,count:0};groups[key].count++;});});
    $('sim-turns').innerHTML=Object.keys(groups).sort().map(function(key){var g=groups[key],s=g.shift;return '<li>'+esc(input.roles[g.role].name)+' · '+shortDays[g.day]+' · '+g.count+' pessoa(s): '+timeLabel(s.start)+'–'+timeLabel(s.end)+(Math.floor(s.end/48)>g.day?' (dia seguinte)':'')+'; pausa '+timeLabel(s.breakStart)+'–'+timeLabel(s.breakStart+input.breakMinutes/30)+'.</li>';}).join('')||'<li>Nenhum turno foi encontrado com os parâmetros informados.</li>';
  }
  function run(){
    input=readInput();var problems=globalThis.GBSC_Escalas.validate(input);if(problems.length){errors(problems);return;}
    results={};['5x2','4x3','mixed'].forEach(function(m){results[m]=globalThis.GBSC_Escalas.simulate(input,m);});
    $('sim-results').hidden=false;$('sim-example-result').hidden=!example;
    $('sim-context').textContent='Demanda informada: '+num(results['5x2'].requiredHours)+' horas de trabalho por semana. Equipe atual: '+num(results['5x2'].currentHours)+'h/semana; capacidade nominal nos modelos de 40h: '+num(results['5x2'].targetHours)+'h/semana.';
    $('sim-cards').innerHTML=['5x2','4x3','mixed'].map(function(m){var r=results[m];return '<article class="sim-result-card"><h3>'+label(m)+'</h3><p class="sim-result-number">'+num(r.shortageHours)+'h</p><p>de trabalho sem cobertura</p><dl><div><dt>Horas distribuídas</dt><dd>'+num(r.scheduledHours)+'h</dd></div><div><dt>Cobertura da demanda</dt><dd>'+num(r.coveredHours)+'h</dd></div><div><dt>Horas fora da demanda informada</dt><dd>'+num(r.scheduledHours-r.coveredHours)+'h</dd></div></dl><button type="button" class="sim-minor" data-result-model="'+m+'" aria-pressed="false">Ver horários deste cenário</button></article>';}).join('');
    renderDetail('5x2');$('sim-results-title').focus();
    $('sim-freshness').textContent='Resultado calculado com os campos atuais.';
  }
  function fillExample(){
    example=true;$('sim-example-note').hidden=false;$('sim-place').value='Exemplo fictício · não representa um cliente';
    days.forEach(function(_,d){$('open-'+d).checked=d!==0;$('start-'+d).value='08:00';$('end-'+d).value='23:00';});
    bands=[['Preparo','08:00','11:00'],['Almoço','11:00','15:00'],['Entre serviços','15:00','18:00'],['Jantar','18:00','22:00'],['Fechamento','22:00','23:00']];renderBands();
    roleData=[{name:'Cozinha',count:5,currentHours:44,mixed:'4x3',fixedStart:'',demand:days.map(function(_,d){return d===0?[0,0,0,0,0]:[2,3,1,d===5?4:3,2];})},{name:'Salão',count:5,currentHours:44,mixed:'5x2',fixedStart:'',demand:days.map(function(_,d){return d===0?[0,0,0,0,0]:[0,3,1,d===5?4:3,2];})},{name:'Caixa',count:2,currentHours:44,mixed:'5x2',fixedStart:'',demand:days.map(function(_,d){return d===0?[0,0,0,0,0]:[0,1,0,1,1];})}];
    renderRoles();renderDemand();$('sim-break').value='60';$('sim-rest').value='11';$('sim-consecutive').checked=false;$('sim-results').hidden=true;showStep(0);
  }
  $('sim-next').addEventListener('click',function(){if(!validStep())return;if(step===0)readBands();if(step===1){readRoles();renderDemand();}if(step===2)readDemand();if(step===3)run();else showStep(step+1);});
  $('sim-prev').addEventListener('click',function(){if(step===2)readDemand();showStep(Math.max(0,step-1));});
  $('sim-example').addEventListener('click',fillExample);
  $('sim-reset').addEventListener('click',function(){if(!window.confirm('Limpar o preenchimento e os resultados desta simulação?'))return;window.location.reload();});
  $('sim-add-role').addEventListener('click',function(){if(roleData.length>=6)return;readRoles();roleData.push({name:'Função '+(roleData.length+1),count:'',currentHours:40,mixed:'5x2',fixedStart:'',demand:days.map(function(){return bands.map(function(){return 0;});})});renderRoles();});
  $('sim-remove-role').addEventListener('click',function(){if(roleData.length<=1)return;readRoles();roleData.pop();renderRoles();});
  $('sim-add-band').addEventListener('click',function(){if(bands.length>=6)return;readBands();bands.push(['Novo período','','']);renderBands();});
  $('sim-remove-band').addEventListener('click',function(){if(bands.length<=1)return;readBands();bands.pop();roleData.forEach(function(r){r.demand.forEach(function(row){row.length=Math.min(row.length,bands.length);});});renderBands();});
  $('sim-apply-hours').addEventListener('click',function(){var start=$('sim-common-start').value,end=$('sim-common-end').value;days.forEach(function(_,d){if($('open-'+d).checked){$('start-'+d).value=start;$('end-'+d).value=end;}});});
  $('demand-rows').addEventListener('click',function(event){var b=event.target.closest('[data-repeat]');if(!b)return;readDemand();var ri=Number(b.dataset.repeat),first=days.findIndex(function(_,d){return $('open-'+d).checked;});if(first<0)return;roleData[ri].demand=days.map(function(_,d){return $('open-'+d).checked?roleData[ri].demand[first].slice():bands.map(function(){return 0;});});renderDemand();});
  $('sim-cards').addEventListener('click',function(event){var b=event.target.closest('[data-result-model]');if(b)renderDetail(b.dataset.resultModel);});
  $('sim-print').addEventListener('click',function(){window.print();});
  $('simulator').addEventListener('input',function(){if(results){$('sim-results').hidden=true;$('sim-freshness').textContent='Você alterou os dados. Compare novamente para atualizar o resultado.';}});
  $('simulator').addEventListener('change',function(){if(results){$('sim-results').hidden=true;$('sim-freshness').textContent='Você alterou os dados. Compare novamente para atualizar o resultado.';}});
  $('simulator').addEventListener('click',function(event){var b=event.target.closest('button');if(results&&b&&(b.hasAttribute('data-repeat')||['sim-add-role','sim-remove-role','sim-add-band','sim-remove-band','sim-apply-hours'].includes(b.id))){$('sim-results').hidden=true;$('sim-freshness').textContent='Você alterou os dados. Compare novamente para atualizar o resultado.';}});
  renderOpening();renderBands();renderRoles();showStep(0,false);
}());
