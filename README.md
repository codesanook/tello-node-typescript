# tello-node-typescript

My playground for using the Tello SDK

Current features:

- Control drone using the commands SDK
- Control drone using Switch Joycons (or any gamepad with remapping)
- Receive status of drone and store in a local state
- Visualize local state at using graphs (using [blessed-contrib](https://github.com/yaronn/blessed-contrib))

TODO:

- Show video feed from drone
- ...

Used examples from https://github.com/jsolderitsch/tello-nodejs on how to connect to the drone via UDP using dgram.

Dependencies
- Python 2.7