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
          name: "PA-1",
          role: 'PA',
          team: "",
          status: "",
          writingFor: "",
          primaryNotes: 0,
          secondaryNotes: 0
        },
        {
          name: "PA-2",
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
    
		// watch for changes
    $scope.$watch('census', function(){
      console.log('census changed');
      $scope.redistribute();
    }, true);
    $scope.$watch('onToday', function(){
      console.log('intern object changed');
      $scope.redistribute();
    }, true);
    
    $scope.redistribute = function(){
      // find lonely team
      var teams = [],
          noteWriters = [],
          subIs = [],
          counts = {},
          lonelyTeam = [],
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
      console.log('Feelin alright');
      	
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