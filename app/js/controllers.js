'use strict';

/* Controllers */

angular.module('wkndcov.controllers', [])
  .controller('coverageCtrl', function($scope, $http) {
		$scope.interns = [];
    $scope.today = moment();
    $scope.datepicker = {
      "date": $scope.today.format('M/D/YYYY')
    };
    $scope.noteTeams = ['A','B','C','Y'];
    $scope.onToday = [];
    /*
    onToday = [
    	{
      	name: "jason",
        role: ['intern', 'subi'],
        team: "Med A",
        status: "post-call",
        writingFor: "A",
        primaryNotes: 8,
        secondaryNotes: 2
      }
    ]
    */
    
    //$scope.isSubI = function(intern){
    //  return (intern.training
    //};
    
    $scope.getOnToday = function(){
      var date = $scope.today.format('D/M/YYYY'),
          dayBefore = $scope.today.subtract(1,'day').format('D/M/YYYY'),
          onCall = [],
      		postCall = [],
          relevantTeams = [
            	"Med A",
            	"Med B",
            	"Med C",
            	"Med Y",
            	"Med X",
            	"Med Con",
            	"Nightfloat"
            ],
          relevantTraining = [
            	"Mercy",
            	"Psych",
            	"Sub-I"
            ],
          crunchInterns;
      
      $http.get('http://www.amion.me/onCall/' + date)
        .success(function(data,status,headers,config){
          console.log(data.onCallTeams);
          crunchInterns('on-call', data.onCallTeams);
          // get post call people
          $http.get('http://www.amion.me/onCall/' + dayBefore)
          	.success(function(data,status,headers,config){
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
          if( relevantTeams.indexOf(team.name) > -1 && team.people.length > 0 ){
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