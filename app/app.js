/**
 * Created by mileesingh on 12/18/16.
 */
var app = angular.module('myApp', ['google.places', 'jtt_instagram','chart.js']);
app.factory('socket', ['$rootScope', function ($rootScope) {
    var socket = io.connect('http://localhost:4041');

    return {
        on: function (eventName, callback) {
            socket.on(eventName, callback);
        },
        emit: function (eventName, data) {
            socket.emit(eventName, data);
        }
    };
}]);
app.config(['ChartJsProvider', function (ChartJsProvider) {
    // Configure all charts
    ChartJsProvider.setOptions({
        chartColors: ['#4286f4', '#ff72f5'],
        responsive: true
    });
    // Configure all line charts
    ChartJsProvider.setOptions('line', {
        showLines: true
    });
}]);
app.controller("HomeController", ['$scope', '$http', '$timeout', 'socket', 'instagramFactory', function ($scope, $http, $timeout, socket, instagramFactory) {
    $scope.imagesObject = [];
    $scope.count = 1;
    $scope.token = "3968699125.e029fea.1c080b992e314386a61be54a1b7a2555";
    var count = 0;
    var images = [];
    $scope.data = [];
    function callApi(lat, lng, timestamp) {
        var params;
        if (timestamp != '') {
            params = {
                lat: lat, lng: lng, access_token: $scope.token, count: 30, max_timestamp: timestamp
            };
        } else {
            params = {
                lat: lat, lng: lng, access_token: $scope.token, count: 30
            };
        }
        instagramFactory.getMediaByCoordinates(params).then(function (response) {
            count++;
            $scope.imagesObject = $scope.imagesObject.concat(response.data.data);

            if (response.data.data.length >= 10 && count < $scope.count) {
                callApi(lat, lng, $scope.imagesObject[$scope.imagesObject.length - 1].created_time);
            } else {
                angular.forEach($scope.imagesObject,function(value,idx){
                    delete value.attribution;
                    delete value.caption;
                    delete value.filter;
                    delete value.link;
                    delete value.tags;
                    delete value.location;
                    delete value.user;
                    delete value.user_has_liked;
                    delete value.users_in_photo;
                });
                console.log($scope.imagesObject);
                alert("Instagram API successfully gave the Images!");
            }
        }).catch(function (response) {
            console.log(response.data);
        });
    }

    $scope.submit = function () {
        var lat = $scope.places.geometry.location.lat();
        var lng = $scope.places.geometry.location.lng();
        callApi(lat, lng, '');

    };
    var id = 0;

    function facesApi(ind) {

        if ($scope.imagesObject[ind].type === 'image') {
            var obj = {};
            obj["url"] = $scope.imagesObject[ind].images.standard_resolution.url;
            $http.post("https://api.projectoxford.ai/face/v1.0/detect?returnFaceId=false&returnFaceLandmarks=false&returnFaceAttributes=age,gender,smile", obj, {
                headers: {
                    'Content-Type': 'application/json',
                    'Ocp-Apim-Subscription-Key': 'f28a8c26ae6c4aaf927d06b2d2fe3eb3'
                }
            }).then(function (response) {
                $scope.imagesObject[ind].faces = response.data;
            });
        }
        if (ind <= $scope.imagesObject.length - 2) {
            $timeout(function () {
                id++;
                facesApi(id)
            }, 200);
        }else{
            console.log("Faces API Done");
            alert("Faces API and Comments has been received!");
        }

    };
    $scope.po = function () {

        $http.post('http://localhost:8080/api/data', JSON.stringify({data: $scope.imagesObject})).then(function (response) {
            console.log(response.data);
            alert("Data has been send to R for Processing!");
        });
    };
    $scope.process = function () {
        $timeout(function () {
            facesApi(0)
        }, 100);
        angular.forEach($scope.imagesObject, function (value, idx) {
            $http.jsonp("https://api.instagram.com/v1/media/" + value.id + "/comments?access_token=" + $scope.token + "&callback=JSON_CALLBACK").then(function (response) {
                value.commentstext = response.data.data;
            });
        });
    };
    $scope.likes = "";
    $scope.comments = "";
    $scope.smiles = "";
    $scope.male = "";
    $scope.female = "";
    $scope.age = "";
    $scope.sentiment = "";

    socket.on('data', function (data) {
        alert("Data received from R!");
        $scope.$apply(function () {
            console.log(data.message);
            $scope.data = data.message;
            $scope.likes = $scope.data[0][0].Likes;
            $scope.comments = $scope.data[0][0].Comments;
            $scope.smiles = $scope.data[0][0].Smiles;
            $scope.male = $scope.data[0][0].Male;
            $scope.female = $scope.data[0][0].Female;
            $scope.age = $scope.data[0][0].Age;
            $scope.positive = $scope.data[0][0].Positive;
            $scope.negative = $scope.data[0][0].Negative;
            $scope.sentiment = $scope.data[1];
            $scope.faces = $scope.data[2];
            $scope.male_female=[$scope.male,$scope.female];
            $scope.male_female_label=["Male","Female"];
            $scope.pos_neg_label=["Positive","Negative"];
            $scope.male_age_average=0;
            $scope.female_age_average=0;
            angular.forEach($scope.faces,function(value,idx){
                if(value.gender==="male"){
                    $scope.male_age_average+=value.age;
                }
                if(value.gender==="female"){
                    $scope.female_age_average+=value.age;
                }
            });
            $scope.male_age_average=$scope.male_age_average/$scope.male;
            $scope.male_age_average=parseFloat(Math.round($scope.male_age_average * 100) / 100).toFixed(2);
            $scope.female_age_average=$scope.female_age_average/$scope.female;
            $scope.female_age_average=parseFloat(Math.round($scope.female_age_average * 100) / 100).toFixed(2);
            $scope.avg=[$scope.male_age_average,$scope.female_age_average];
            $scope.avg_sentiment=[$scope.positive,$scope.negative];

        });

    });
}]);