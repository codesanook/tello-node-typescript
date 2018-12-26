import * as readline from 'readline'

import Tello from './tello'
import LiveStatus from './live'

const rl = readline.createInterface(process.stdin, process.stdout)

const drone = new Tello(() => {
  rl.prompt()
})

rl.on('line', input => {
  const commandStr = input.trim()

  switch (commandStr) {
    case 'quit':
      drone.close()
      rl.close()
      break
    case 'testflight':
      drone.initiateTestFlight()
      break
    case 'status':
      console.info(drone.getStatus())
      rl.prompt()
      break
    case 'live':
      LiveStatus.start(drone)
      break
    case 'help':
    case 'stop':
    case 'no':
      drone.uhoh()
      break
    default:
      drone.command(commandStr).catch(error => {
        throw error
      })
      break
  }
}).on('close', () => {
  console.log('Exiting Command Line Processor')
  process.exit(0)
})

const prefix = 'Droneboi > '
;(async () => {
  await drone.initialize()
  rl.setPrompt(prefix)
  rl.prompt()
})()
