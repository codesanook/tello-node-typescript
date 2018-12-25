const dgram = require('dgram')

const PORT = 8889
const HOST = '192.168.10.1'

class Tello {
  constructor(callback) {
    this.client = dgram.createSocket('udp4')
    this.client.bind(8001)
    this.client.on('message', (msg, info) => {
      console.log('Data received from server : ' + msg.toString())
      callback()
      this.executeQueuedCommand()
    })

    this.queuedCommands = []
    this.executingCommand = null
  }

  async initialize() {
    console.info('Initializing drone connection')
    await this.command('command')
    await this.command('battery?')
  }

  close() {
    this.client.close()
  }

  uhoh() {
    this.command('emergency')
  }

  initiateTestFlight() {
    this.queuedCommands = [
      { text: 'takeoff', wait: 0 },
      { text: 'up 50', wait: 0 },
      { text: 'flip f', wait: 50 },
      { text: 'back 50', wait: 0 },
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
      this.client.send(command, 0, command.length, PORT, HOST, (err, bytes) => {
        if (err) {
          reject(err)
        }

        this.executingCommand = null
        resolve()
      })
    })
  }
}

module.exports = Tello
