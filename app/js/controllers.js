'use strict';

/* Controllers */

angular.module('wkndcov.controllers', [])
  .controller('coverageCtrl', function($scope, $http) {
    $scope.census = {
      A: 0,
      B: 0,
      C: 0,
      Y: 0,
      sub: {
        A: 0,
        B: 0,
        C: 0,
        Y: 0
      }
    };
    $scope.today = moment();
    $scope.datepicker = {
      "date": $scope.today.toDate(),
      "toggle": function(){
        // using jQuery here, ugly, but maybe necessary?
        var elem = $('#datePicker');
        console.log(elem);
        if(elem.is(':focus')){ elem.blur(); }
        else { elem.focus(); }
      }
    };
    $scope.noteTeams = ['A','B','C','Y'];
    $scope.onTodayTemplate = function(){
      return [
        {
          name: "PA (1st team)",
          role: 'PA',
          team: "",
          status: "",
          writingFor: "",
          primaryNotes: 0,
          secondaryNotes: 0
        },
        {
          name: "PA (2nd team)",
          role: 'PA',
          team: "",
          status: "",
          writingFor: "",
          primaryNotes: 0,
          secondaryNotes: 0
        }
      ];
    };
    $scope.onToday = $scope.onTodayTemplate();
    $scope.lonelyTeam = '';
    $scope.alertTxt = '';
    $scope.dateOptions = {format: 'mm/dd/yyyy'};
    
    $scope.alert = function(message){
      $scope.alertTxt = message;
    };
    
    $scope.hasSubI = function(team){
      return $scope.onToday.filter(function(person){ return person.role === 'Sub-I' && person.writingFor === team; }).length > 0;
    };
    
		// watch for changes
    $scope.$watch('census', function(){
      $scope.redistribute();
    }, true);
    $scope.$watch('onToday', function(oldVal, newVal){
      var oldTeams = oldVal.map(function(person){ return person.writingFor; }).join();
      var newTeams = newVal.map(function(person){ return person.writingFor; }).join();
      if (oldTeams !== newTeams){
      	$scope.redistribute();
      }
    }, true);
    
    $scope.totalCensus = function(team){
      var result = parseFloat($scope.census[team]) + parseFloat($scope.census.sub[team]);
      return result || 0;
    };
    
    $scope.censusStyle = function(team){
      var c = $scope.totalCensus(team);
      return c >= 20 ? 'alert-danger' : c > 15 ? 'alert' : 'alert-success';
    };
    
    $scope.redistribute = function(){
      // find lonely team
      var teams = [],
          noteWriters = [],
          postCall = [],
          onCall = [],
          PA = [],
          subIs = [],
          counts = {},
          lonelyTeam = [],
          lonelyIntern = '',
          census = $scope.census,
          onTodayCopy = angular.copy($scope.onToday);
      
      // give sub-i notes to them
      angular.forEach(census.sub, function(notes,team){
        angular.forEach($scope.onToday, function(person){
          if(person.role === 'Sub-I' || person.writingFor === team){
          	person.primaryNotes = notes;
          }
        });
      });
      
      // pull out teams with map, then filter out empty/unassigned
      teams = $scope.onToday.map(function(person){
        		if (person.role !== 'Sub-I' && $scope.noteTeams.indexOf(person.writingFor) > -1 && typeof person.writingFor !== 'undefined'){
              person.secondaryNotes = 0;
          		noteWriters.push(person);
              return person.writingFor;
            } else {
              if(person.role === 'Sub-I'){
                subIs.push(person);
              }
              return false;
            }
      		})
      		.filter(function(team){ return team; });
      
      if (teams.length === 0){
        $scope.alert('Choose a Date...');
        return false;
      }
      angular.forEach(teams, function(item){
        counts[item] = counts[item] ? counts[item] + 1 : 1;
      });
      // check for single lonely team
      angular.forEach(counts, function(val, key){ if (val === 1) lonelyTeam.push(key); });
      if(lonelyTeam.length !== 1){
        $scope.alert('Make sure you assign the correct teams to PAs, Med X, etc');
        return false;
      } else {
        lonelyTeam = lonelyTeam[0];
        $scope.lonelyTeam = lonelyTeam;
      }
      // Ok, we have one lonely team, check for censuses
      if(census.A < 1 || census.B < 1 || census.C < 1 || census.Y < 1){
        $scope.alert('Make sure censuses are correct');
        return false;
      }
      // We have one lonely team, good censuses, check for 7 note writers
      if(noteWriters.length !== 7){
        $scope.alert('Need to have 7 note writers, including PA (counts as two) and excluding Sub-Is');
        return false;
      }
      // Passed all the checks, should be good to go
      $scope.alert('');
      // split censuses
      lonelyIntern = noteWriters.filter(function(person){ return person.writingFor === lonelyTeam; })[0];
      // give half of lonelyTeam to lonelyIntern (round down)
      lonelyIntern.primaryNotes = census[lonelyTeam] % 2 === 1 ? (census[lonelyTeam] / 2) - 0.5 : census[lonelyTeam]/2;
      
      // split team censuses, need to do this first, in case
      // anyone is already writing 10 notes
      angular.forEach(census, function(census,team){
        if(team !== lonelyTeam){ // lonelyTeam already done
          var half = (census % 2 === 1) ? census/2 + 0.5 : census/2; // rounding up
          var toGive = census;
          // find interns
          var thisTeam = noteWriters.filter(function(person){ return person.writingFor === team; })
          													.map(function(person){ return person.name; });
          angular.forEach(noteWriters, function(person){
            if(thisTeam.indexOf(person.name) > -1){
              person.primaryNotes = (toGive === census)? toGive - half : toGive; // lesser half first
              toGive = half;
            }
          });
        }
      });
      console.log('distributed primary', noteWriters);
			      
      // algo: Post call intern 1 -> post call intern 2 -> on call intern 1
      // -> on call intern 2 -> on call intern 3 -> PA -> post call intern 1 -> post call intern 2, etc. etc. 
      // INTERN D should be either post call intern 1 or on call intern 1 (depending on where they are in their call cycle).
      
      // Assign positions in round robin
      postCall = noteWriters.filter(function(person){ return person.status === 'post-call'; });
      onCall = noteWriters.filter(function(person){ return person.status === 'on-call'; });
      PA = noteWriters.filter(function(person){ return person.role === 'PA'; });
      
      // sort lonelyIntern to first position in group
      function comparator(a, b) {
        if (a.name === lonelyIntern.name) return -1;
        return 0;
      }
      if(lonelyIntern.status === 'on-call'){ onCall.sort(comparator); }
      if(lonelyIntern.status === 'post-call'){ postCall.sort(comparator); }
      
      // distribute
      console.log('distribute secondary');
      var toDistribute = census[lonelyTeam] - lonelyIntern.primaryNotes,
          distroCheck = 0;
      function isFull(intern){
        if( !angular.isArray(intern) ){ // not a PA
        	if( intern.role !== 'PA' && intern.primaryNotes + intern.secondaryNotes >= 10 ) return true;
        } else { // should be a PA, add total of both
        	if( intern[0].role === 'PA' && intern[0].primaryNotes + intern[0].secondaryNotes + intern[1].primaryNotes >= 20 ) return true;
        }
        return false;
      }
      while(toDistribute > 0){
      	distroCheck = toDistribute;
        angular.forEach(postCall, function(intern){
          if(toDistribute < 1 || isFull(intern)) return;
          intern.secondaryNotes += 1;
          toDistribute -= 1;
        });
        if(toDistribute < 1) break;
        angular.forEach(onCall, function(intern){
          if(toDistribute < 1 || isFull(intern)) return;
          intern.secondaryNotes += 1;
          toDistribute -= 1;
        });
        if(toDistribute < 1) break;
        if(!isFull(PA)){
          PA[0].secondaryNotes += 1;
          toDistribute -= 1;
        }
        // check if notes distributed this round - if not, everyone must be full
        // then need to start including night float :(
        if(distroCheck === toDistribute){
          console.log('Night float needed');
          var nightFloat = onTodayCopy.filter(function(person){
            person.secondaryNotes = 0;
            return person.team.indexOf('NF Intern') > -1;
          });
          while(toDistribute > 0){
            angular.forEach(nightFloat,function(person){
              if(toDistribute < 1 || isFull(person)) return;
              person.secondaryNotes += 1;
              toDistribute -= 1;
            });
          }
          // all notes distributed, add night float to post-call
          postCall = postCall.concat(nightFloat);
        }
      }
      // now we have three arrays of people with distributed notes for lonely teams
      // split up censuses for rest of teams
      // rejoin all the notewriters now with extra notes distributed
      noteWriters = postCall.concat(onCall,PA);
      console.log('distributed secondary',noteWriters);
      
			// now noteWriters should be all set. update onTodayCopy, then reset onToday
			angular.forEach(noteWriters, function(updatedPerson){
        // find matching record, overwrite
        angular.forEach(onTodayCopy, function(person){
          if(person.name === updatedPerson.name){
            person.primaryNotes = updatedPerson.primaryNotes;
            person.secondaryNotes = updatedPerson.secondaryNotes;
          }
        });
      });
      $scope.onToday = onTodayCopy;
    };
    
    $scope.getOnToday = function(){
      var day = typeof $scope.datepicker.date === 'object' ? moment($scope.datepicker.date) : moment($scope.datepicker.date, 'MM/DD/YYYY'),
          onCall = [],
      		postCall = [],
          relevantTeams = [
            	"Med A",
            	"Med B",
            	"Med C",
            	"Med Y",
            	"Med X",
            	"Med Con"
            ],
          relevantTraining = [
            	"Mercy",
            	"Psych",
            	"Sub-I"
            ],
          crunchInterns;

      // clear current interns
      $scope.onToday = $scope.onTodayTemplate();
      
      $http.get('http://www.amion.me/onCall/' + day.format('DD/MM/YYYY'))
        .success(function(data,status,headers,config){
          console.log('oncall: ',data.onCallTeams);
          crunchInterns('on-call', data.onCallTeams);
          // get post call people
          $http.get('http://www.amion.me/onCall/' + day.subtract(1,'days').format('DD/MM/YYYY'))
          	.success(function(data,status,headers,config){
              console.log('post-call :', data.onCallTeams);
              crunchInterns('post-call', data.onCallTeams);
            });
        })
        .error(function(data,status,headers,config){
          console.error(data);
        });
      
      crunchInterns = function(status, data){
        // reformat relevant data
        function mapTeam(team){
          team = team.replace('Med ','');
          if( $scope.noteTeams.indexOf(team) > -1 ){
            return team;
          } else {
            return '';
          }
        };
        angular.forEach(data, function(team){
          if( (relevantTeams.indexOf(team.name) > -1 || (status === 'post-call' && team.name === "Night Float") ) && team.people.length > 0 ){
            angular.forEach(team.people, function(person){
              if( relevantTraining.indexOf(person.training) > -1 ){
                $scope.onToday.push({
                  name: person.name,
                  role: person.training,
                  team: person.service,
                  status: status,
                  writingFor: mapTeam(team.name),
                  primaryNotes: 0,
                  secondaryNotes: 0
                });
              }
            });
          }
        });
        console.log($scope.onToday);
 				return true;
      };
    };
  });