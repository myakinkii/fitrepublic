# fit-republic monorepo with local sqlite deployment

## Install/Build/Run

### cds stuff and admin api -> http://localhost:4004
```
npm install
npm run build
npm run deploy
npm run local
```

### admin flp and apps -> http://localhost:8080/indexLocal.html
```
cd app 
ln -s ../ui_fe_coaches/resources coaches
ln -s ../ui_fe_gyms/resources gyms
ln -s ../ui_fe_promos/resources promos
ln -s ../ui_fe_purchases/resources purchases
ln -s ../ui_fe_settings/resources settings
ui5 serve
```

### mobile apps api and public service -> http://localhost:4044
```
cd srv_mobile
ln -s ../srv/gen gen
npm run local
```

### client app -> http://localhost:8081/index.html
```
cd ui5_clientApp/resources
ui5 serve
```

### coach app -> http://localhost:8082/index.html
```
cd ui5_coachApp/resources
ui5 serve
```

## Roles/Features
### Client (mobile service api)
* can onboard anonymously
* can perform Freestyle workouts
* can use any content from visible coaches in workouts
* can subscribe to any published programs from visible coaches
* can perform workouts from programs or clone them into freestyle workouts
* can connect with Coach via coach code (obtained outside of the app)
* can perform Gym or Online workouts where exercises are managed by his Coach

### Coach (mobile service api)
* must obtain an registration code to onboard (or a special secret to restore profile) from Admin
* can create Client codes and see the list of codes and whether it was activated by a client
* can manage list of active clients and browse their workouts
* can use predefined set of Standard videos in Gym and Online workouts with his clients
* can use his own Content (after Admin adds it to system)
* can create worout templates to copy into clients' workouts or publish as programs

### Admin (admin service api)
* manages System settings
* manages Coaches and their content
* manages Gyms and Equipment
* can add exercise videos from library to Equipment for publishing as qr codes (e.g. to physically print out and attach to equipment)
* can publish objects and create shortlinks (to public service)
* can browse Coach codes (Promos) report and Purchases (planned and dropped billing stuff)

### External user (public service api)
* uses url shortener feature complementing object publishing as qr codes
* can visit special pages pointing to in-app object (coach or a program) or specific equipment from gym (exemplary videos list)
