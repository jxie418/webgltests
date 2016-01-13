#! /bin/bash
cd public/models/
rm -rf *
cp -rf /Users/jamesxieaudaexplorecom/gdrive/DeployFolder/GenericModels/* .
printf '%s ' * > graphics.txt
cp -rf /Users/jamesxieaudaexplorecom/Documents/WebGLOldONe/public/models/garage .
echo "Done"
#cd ../js
#cp -rf /Users/jamesxieaudaexplorecom/Documents/Dev/Code/Cordova/ionic/Test3DModels/www/js .
#cd ../../
#node service.js
