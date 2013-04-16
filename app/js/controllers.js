'use strict';

/* Controllers */

angular.module('wkndcov.controllers', [])
  .controller('coverageCtrl', function($scope, $http) {
    $scope.census = {
      A: 0,
      B: 0,
      C: 0,
      Y: 0
    };
    $scope.today = moment();
    $scope.datepicker = {
      "date": $scope.today.format('M/D/YYYY')
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
    
		// watch for changes
    $scope.$watch('census', function(){
      console.log('census changed');
      $scope.redistribute();
    }, true);
    $scope.$watch('onToday', function(oldVal, newVal){
      var oldTeams = oldVal.map(function(person){ return person.writingFor; }).join();
      var newTeams = newVal.map(function(person){ return person.writingFor; }).join();
      if (oldTeams !== newTeams){
        console.log('team assignment changed');
      	$scope.redistribute();
      }
    }, true);
    
    $scope.teamWatch = function(){
  		console.log('watching');
      return $scope.onToday.map(function(person){ return person.writingFor; });
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
          census = $scope.census;
      
      // pull out teams with map, then filter out empty/unassigned
      teams = $scope.onToday.map(function(person){
        		if (person.role !== 'Sub-I' && $scope.noteTeams.indexOf(person.writingFor) > -1 && typeof person.writingFor !== 'undefined'){
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
        console.log('no teams, exiting redistribute');
        return false;
      }
      angular.forEach(teams, function(item){
        counts[item] = counts[item] ? counts[item] + 1 : 1;
      });
      // check for single lonely team
      angular.forEach(counts, function(val, key){ if (val === 1) lonelyTeam.push(key); });
      if(lonelyTeam.length !== 1){
        console.log('too many lonely teams', lonelyTeam);
        return false;
      } else {
        lonelyTeam = lonelyTeam[0];
        $scope.lonelyTeam = lonelyTeam;
      }
      // Ok, we have one lonely team, check for censuses
      if(census.A < 1 || census.B < 1 || census.C < 1 || census.Y < 1){
        console.log('Census of zero? Seriously?', census);
        return false;
      }
      // We have one lonely team, good censuses, check for 7 note writers
      if(noteWriters.length !== 7){
        console.log('Need to have 7 note writers, including PA (counts as two)');
        return false;
      }
      // Passed all the checks, should be good to go
      // split censuses
      lonelyIntern = noteWriters.filter(function(person){ return person.writingFor === lonelyTeam; });
      // give half of lonelyTeam to lonelyIntern (round down)
      lonelyIntern.primaryNotes = census[lonelyTeam] % 2 === 1 ? (census[lonelyTeam] / 2) - 0.5 : census[lonelyTeam]/2;
      // algo: Post call intern 1 -> post call intern 2 -> on call intern 1
      // -> on call intern 2 -> on call intern 3 -> PA -> post call intern 1 -> post call intern 2, etc. etc. 
      // INTERN D should be either post call intern 1 or on call intern 1 (depending on where they are in their call cycle).
      // Assign positions in round robin
      postCall = noteWriters.filter(function(person){ return person.status = 'post-call'; });
      onCall = noteWriters.filter(function(person){ return person.status = 'on-call'; });
      PA = noteWriters.filter(function(person){ return person.role = 'PA'; });
      
      // sort lonelyIntern to first position in group
      function comparator(a, b) {
        if (a.name === lonelyIntern.name) return -1;
        return 0;
      }
      if(lonelyIntern.status === 'on-call'){ onCall.sort(comparator); }
      if(lonelyIntern.status === 'post-call'){ postCall.sort(comparator); }
      
      // distribute
      console.log('distribute');
      var toDistribute = census[lonelyTeam] - lonelyIntern.primaryNotes;
      while(toDistribute > 0){
        angular.forEach(postCall, function(intern){
          if(toDistribute < 1) return;
          intern.secondaryNotes += 1;
          toDistribute -= 1;
        });
        if(toDistribute < 1) break;
        angular.forEach(onCall, function(intern){
          if(toDistribute < 1) return;
          intern.secondaryNotes += 1;
          toDistribute -= 1;
        });
        if(toDistribute < 1) break;
        PA[0].secondaryNotes += 1;
        toDistribute -= 1;
      }
      // now we have three arrays of people with distributed notes for lonely teams
      // split up censuses for rest of teams
      // rejoin all the notewriters now with extra notes distributed
      noteWriters = postCall.concat(onCall,PA);
      console.log('distributed lonely',noteWriters);
      // split rest of teams
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
      console.log('distributed teams', noteWriters);
			// now noteWriters should be all set. copy onToday, update, and then set onToday
      var onTodayCopy = angular.copy($scope.onToday);
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
      var day = moment($scope.datepicker.date, 'MM/DD/YYYY'),
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