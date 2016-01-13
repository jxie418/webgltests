/**
 * Created by jamesxieaudaexplorecom on 10/16/15.
 */
app.factory('DamageViewService', function($http,$q) {
    var DamageViewService = {};
    DamageViewService.getObjectFileNames = function(folder) {
        var q = $q.defer();
        var path=folder+"material_type.txt";
        $http.get(path).success(function(response){
            var results = [];
            response = response.trim().replace(/\n/g, " ");
            try{
                results = response.split(" ");
                q.resolve(results);
            }catch(err){
                q.reject(err);
            }
        }).error(function(error){
            q.reject(error);
        });
        return q.promise;
    };

    DamageViewService.getCarLightsPositions = function(folder) {
        var q = $q.defer();
        var path=folder+"car_lights_pos.txt";
        $http.get(path).success(function(response){
            var results = [];
            var response = response.trim().replace(/\r\n/g, ":");
            try{
                var results = response.split(":");
                q.resolve(results);
            }catch(err){
                q.reject(err);
            }
        }).error(function(error){
            q.reject(error);
        });
        return q.promise;
    };
    return DamageViewService;
});