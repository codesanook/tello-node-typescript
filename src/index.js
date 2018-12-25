const readline = require('readline')

const Tello = require('./tello')

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
  rl.setPrompt(prefix, prefix.length)
  rl.prompt()
})()
