const dgram = require('dgram')

const CMD_PORT = 8889
const STATUS_PORT = 8890
const CAMERA_PORT = 8889
const HOST = '192.168.10.1'

class Tello {
  constructor(commandFinishedCallback) {
    this.initializeStatusClient()
    this.initializeCommandClient(commandFinishedCallback)

    this.queuedCommands = []
    this.executingCommand = null
  }

  async initialize() {
    console.info('Initializing drone connection')
    await this.command('command')
    await this.command('battery?')
  }

  initializeStatusClient() {
    this.statusClient = dgram.createSocket('udp4')
    this.statusClient.bind(STATUS_PORT)
    this.statusClient.on('message', this.updateDroneStatus)
  }

  initializeCommandClient(commandFinishedCallback) {
    this.client = dgram.createSocket('udp4')
    this.client.bind(CMD_PORT)
    this.client.on('message', (msg, info) => {
      console.log('Data received from server : ' + msg.toString())
      commandFinishedCallback()
      this.executeQueuedCommand()
    })
  }

  updateDroneStatus(msg, info) {
    const dataString = msg
      .toString()
      .split(';')
      .slice(0, -1)
    const status = {}
    dataString.forEach(dataPoint => {
      const dataPointTuple = dataPoint.split(':')
      status[dataPointTuple[0]] = dataPointTuple[1]
    })

    this.status = status
  }

  uhoh() {
    this.command('emergency')
  }

  initiateTestFlight() {
    this.queuedCommands = [
      { text: 'takeoff', wait: 0 },
      { text: 'up 100', wait: 0 },
      { text: 'flip f', wait: 50 },
      { text: 'flip b', wait: 50 },
      { text: 'flip l', wait: 50 },
      { text: 'flip r', wait: 50 },
      { text: 'down 50', wait: 0 },
      { text: 'land', wait: 500 },
      { text: 'battery?', wait: null },
    ]

    this.executeQueuedCommand()
  }

  executeQueuedCommand() {
    if (this.queuedCommands.length > 0) {
      const command = this.queuedCommands.shift()

      setTimeout(() => this.command(command.text), command.wait)
    }
  }

  command(command) {
    this.executingCommand = command

    return new Promise((resolve, reject) => {
      console.log(`Command: ${command}`)
      this.client.send(command, 0, command.length, CMD_PORT, HOST, (err, bytes) => {
        if (err) {
          reject(err)
        }

        this.executingCommand = null
        resolve()
      })
    })
  }

  close() {
    this.client.close()
  }
}

module.exports = Tello
