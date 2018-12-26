import * as dgram from 'dgram'

const CMD_PORT = 8889
const STATUS_PORT = 8890
const CAMERA_PORT = 11111
const HOST = '192.168.10.1'

interface DroneStatus {
  something?: boolean
}

type Command = {
  text: string
  wait?: number
}

class Tello {
  private client: dgram.Socket = dgram.createSocket('udp4')
  private statusClient: dgram.Socket = dgram.createSocket('udp4')
  private videoClient: dgram.Socket = dgram.createSocket('udp4')

  private executingCommand: string | null = null
  private queuedCommands: Command[] = []
  private status: DroneStatus = {}

  constructor(commandFinishedCallback) {
    this.initializeCommandClient(commandFinishedCallback)
    this.initializeStatusClient()
    this.initializeVideoClient()
  }

  public async initialize() {
    console.info('Initializing drone connection')
    await this.command('command')
    await this.command('battery?')
  }

  private initializeCommandClient(commandFinishedCallback) {
    this.client.bind(CMD_PORT)
    this.client.on('message', (msg, info) => {
      console.log('Data received from server : ' + msg.toString())
      commandFinishedCallback()
      this.executeQueuedCommand()
    })
  }

  private initializeStatusClient() {
    this.statusClient.bind(STATUS_PORT)
    this.statusClient.on('message', this.updateDroneStatus)
  }

  private initializeVideoClient() {
    this.videoClient = dgram.createSocket('udp4')
    this.videoClient.bind(CAMERA_PORT)
    this.videoClient.on('message', (msg, info) => {
      console.log(msg.toString())
    })
  }

  private updateDroneStatus(msg, info) {
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

export default Tello
