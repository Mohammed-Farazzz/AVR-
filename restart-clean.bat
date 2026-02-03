@echo off
echo UniWay - Restarting (clear cache)...

REM Kill port 8081
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8081" ^| find "LISTENING"') do taskkill /F /PID %%a >nul 2>&1

REM Start with clear cache
npx expo start --clear

OK really perfect all I can say point is exceptional like it's really exceptional because I'm currently looking into the application and everything seems very good man only there are certain changes which I just need you to do in here which is On destination list screen Is there any chance that we can have snacks icon for canteen and the playing icon for playground and then i need youto change the blue accent colour in the navigation screen localtion -> destination screen like that purpleb and blue accent e there - we need to change that to something classy as we did earlier 
and on the same screen the "Next Step" button is not functioning on the last step- when we supposed to show them youre arrived type thing with cool UI

and then I need you to bring up a you are arrived modal into the camera guide (AR) as well when they clieked on the last "-> Next on the camera area" and then there is sd size faded out effect in the arrow on the AR on the top of arrow- can you deeply check this and resolve??