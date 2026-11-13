(function () {
  'use strict';
  var WEEK = 336;
  function time(t) {
    if (typeof t !== 'string' || !/^([01]\d|2[0-3]):(00|30)$/.test(t)) return null;
    return Number(t.slice(0, 2)) * 2 + Number(t.slice(3)) / 30;
  }
  function windowOf(day, index) {
    var a = time(day.start), b = time(day.end);
    if (a === null || b === null || a === b) return null;
    return { start: index * 48 + a, end: index * 48 + b + (b < a ? 48 : 0) };
  }
  function bandOf(band, day, index) {
    var a = time(band.start), b = time(band.end), opening = time(day.start);
    if (a === null || b === null || a === b || opening === null) return null;
    var start = index * 48 + a + (a < opening ? 48 : 0);
    return { start: start, end: start + (b > a ? b - a : 48 - a + b) };
  }
  function validate(x) {
    var errors = [];
    if (!x || !Array.isArray(x.opening) || x.opening.length !== 7 || !Array.isArray(x.bands) || !x.bands.length || x.bands.length > 6 || !Array.isArray(x.roles) || !x.roles.length || x.roles.length > 6) return ['Preencha os dias, períodos e ao menos uma função.'];
    if (![30,60,90,120].includes(x.breakMinutes)) errors.push('Escolha um intervalo de 30, 60, 90 ou 120 minutos.');
    if (!Number.isFinite(x.restHours) || x.restHours < 11 || x.restHours > 24 || x.restHours * 2 % 1) errors.push('Informe descanso entre jornadas de 11 a 24 horas, em passos de meia hora.');
    if (!x.opening.some(function(d){return d.active;})) errors.push('Escolha ao menos um dia de funcionamento.');
    x.opening.forEach(function(d,i){ if (d.active && !windowOf(d,i)) errors.push('Confira entrada e saída do dia ' + (i+1) + ': horários diferentes, em passos de 30 minutos.'); });
    var openingSlots = new Set();
    x.opening.forEach(function(d,i){if(!d.active)return;var w=windowOf(d,i);if(!w)return;for(var k=w.start;k<w.end;k++){if(openingSlots.has(k%WEEK))errors.push('As janelas de trabalho de dias diferentes não podem se sobrepor na madrugada.');openingSlots.add(k%WEEK);}});
    var occupied = new Set();
    x.bands.forEach(function(b){
      var a = time(b.start), z = time(b.end);
      if (!b.name || a === null || z === null || a === z) {errors.push('Cada período precisa de nome e horários diferentes, em passos de 30 minutos.');return;}
      for(var k=a;k<(z>a?z:z+48);k++){if(occupied.has(k%48)) errors.push('Os períodos não podem se sobrepor.');occupied.add(k%48);}
    });
    var required = 0, workers = 0, names = new Set();
    x.roles.forEach(function(r){
      if (typeof r.name !== 'string' || !r.name.trim() || r.name.length > 50 || names.has(r.name.trim().toLowerCase())) errors.push('Use nomes diferentes para as funções (até 50 caracteres).');
      else names.add(r.name.trim().toLowerCase());
      if(!Number.isInteger(r.count)||r.count<0||r.count>30) errors.push('Informe de 0 a 30 pessoas por função.');
      workers += r.count || 0;
      if(!Number.isFinite(r.currentHours)||r.currentHours<=0||r.currentHours>60)errors.push('Informe a jornada semanal atual de cada pessoa do grupo, até 60 horas.');
      if(!['5x2','4x3'].includes(r.mixed))errors.push('Escolha o modelo misto de cada função.');
      if(r.fixedStart && time(r.fixedStart)===null)errors.push('A entrada fixa precisa usar passos de 30 minutos.');
      if(!Array.isArray(r.demand)||r.demand.length!==7){errors.push('Complete a necessidade por dia e função.');return;}
      r.demand.forEach(function(row,d){
        if(!Array.isArray(row)||row.length!==x.bands.length){errors.push('Complete todos os períodos da função.');return;}
        row.forEach(function(n,b){
          if(!Number.isInteger(n)||n<0||n>30){errors.push('A necessidade deve ser um número inteiro entre 0 e 30.');return;}
          if(!x.opening[d].active || !n)return;
          required += n;
          var w=windowOf(x.opening[d],d),p=bandOf(x.bands[b],x.opening[d],d);
          if(w&&p&&(p.start<w.start||p.end>w.end))errors.push(r.name+', dia '+(d+1)+', período '+x.bands[b].name+': há demanda fora do horário de trabalho informado. Ajuste o período ou a necessidade para zero.');
        });
      });
    });
    if(!workers)errors.push('Informe ao menos uma pessoa na equipe.');
    if(!required)errors.push('Preencha ao menos uma necessidade de pessoas em um dia ativo.');
    return Array.from(new Set(errors));
  }
  function combinations(days, count) {
    var result=[];
    function go(at,chosen){if(chosen.length===count){result.push(chosen.slice());return;}for(var i=at;i<days.length;i++){chosen.push(days[i]);go(i+1,chosen);chosen.pop();}}
    go(0,[]);return result;
  }
  function enoughConsecutiveOff(days, count) {
    var best=0,run=0;
    for(var d=0;d<14;d++){run=days.includes(d%7)?0:run+1;best=Math.max(best,run);}
    return best>=count;
  }
  function simulate(x, model) {
    var problems=validate(x);
    if(problems.length)throw new Error(problems.join(' '));
    if(!['5x2','4x3','mixed'].includes(model))throw new Error('Modelo inválido.');
    var required=x.roles.map(function(){return Array(WEEK).fill(0);});
    var coverage=x.roles.map(function(){return Array(WEEK).fill(0);});
    x.roles.forEach(function(r,ri){r.demand.forEach(function(row,day){if(!x.opening[day].active)return;row.forEach(function(n,bi){if(!n)return;var p=bandOf(x.bands[bi],x.opening[day],day);for(var k=p.start;k<p.end;k++)required[ri][k%WEEK]+=n;});});});
    var warnings=[],assignments=[];
    x.roles.forEach(function(role,ri){
      var mode=model==='mixed'?role.mixed:model,dayCount=mode==='4x3'?4:5,work=mode==='4x3'?20:16,pause=x.breakMinutes/30;
      if(role.currentHours<40){if(role.count)warnings.push(role.name+': contrato abaixo de 40h; grupo não distribuído nos modelos de 40h.');return;}
      var candidates=[];
      x.opening.forEach(function(day,d){
        candidates[d]=[];if(!day.active)return;
        var w=windowOf(day,d);
        for(var start=w.start;start+work+pause<=w.end;start++){
          if(role.fixedStart && start%48!==time(role.fixedStart))continue;
          var bs=start+work/2, slots=[];
          for(var k=start;k<start+work+pause;k++)if(k<bs||k>=bs+pause)slots.push(k);
          candidates[d].push({start:start,end:start+work+pause,breakStart:bs,workSlots:slots});
        }
      });
      var available=candidates.map(function(a,d){return a.length?d:-1;}).filter(function(d){return d>=0;});
      var patterns=combinations(available,dayCount).filter(function(days){return !x.consecutive||enoughConsecutiveOff(days,7-dayCount);});
      for(var person=0;person<role.count;person++){
        var bestDay=candidates.map(function(list){
          var best=null;
          list.forEach(function(shift){
            var covered=0;
            shift.workSlots.forEach(function(k){if(coverage[ri][k%WEEK]<required[ri][k%WEEK])covered++;});
            var score=covered*100-(work-covered);
            if(!best||score>best.score)best={shift:shift,score:score};
          });return best;
        });
        var bestPattern=null;
        patterns.forEach(function(days){
          var shifts=days.map(function(d){return bestDay[d].shift;}),score=days.reduce(function(a,d){return a+bestDay[d].score;},0);
          for(var j=0;j<shifts.length;j++){var next=shifts[(j+1)%shifts.length].start+(j===shifts.length-1?WEEK:0);if(next-shifts[j].end<x.restHours*2)return;}
          if(!bestPattern||score>bestPattern.score)bestPattern={shifts:shifts,score:score};
        });
        if(!bestPattern){warnings.push(role.name+': não foi encontrada uma distribuição para todas as pessoas com as janelas e descansos informados.');break;}
        bestPattern.shifts.forEach(function(s){s.workSlots.forEach(function(k){coverage[ri][k%WEEK]++;});});
        assignments.push({roleIndex:ri,person:person,mode:mode,shifts:bestPattern.shifts});
      }
    });
    var requiredSlots=0,coveredSlots=0,scheduledSlots=0,shortageSlots=0,cells=[];
    x.roles.forEach(function(role,ri){
      required[ri].forEach(function(n,k){requiredSlots+=n;coveredSlots+=Math.min(n,coverage[ri][k]);scheduledSlots+=coverage[ri][k];shortageSlots+=Math.max(0,n-coverage[ri][k]);});
      role.demand.forEach(function(row,d){if(!x.opening[d].active)return;row.forEach(function(n,bi){var p=bandOf(x.bands[bi],x.opening[d],d),min=null,missing=0;
        if(!p)return;for(var k=p.start;k<p.end;k++){min=min===null?coverage[ri][k%WEEK]:Math.min(min,coverage[ri][k%WEEK]);missing+=Math.max(0,n-coverage[ri][k%WEEK]);}
        cells.push({roleIndex:ri,day:d,band:bi,needed:n,minCoverage:min,shortageHours:missing/2});
      });});
    });
    return {model:model,requiredHours:requiredSlots/2,coveredHours:coveredSlots/2,shortageHours:shortageSlots/2,scheduledHours:scheduledSlots/2,targetHours:x.roles.reduce(function(a,r){return a+r.count*40;},0),currentHours:x.roles.reduce(function(a,r){return a+r.count*r.currentHours;},0),assignments:assignments,warnings:Array.from(new Set(warnings)),cells:cells};
  }
  globalThis.GBSC_Escalas={validate:validate,simulate:simulate};
}());
