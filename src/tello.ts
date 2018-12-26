import * as dgram from 'dgram'

const CMD_PORT = 8889
const STATUS_PORT = 8890
const CAMERA_PORT = 11111
const HOST = '192.168.10.1'

/**
 * Example status:
  {
    mid: '257',
    x: '0',
    y: '0',
    z: '0',
    mpry: '0,0,0',
    pitch: '-1',
    roll: '0',
    yaw: '0',
    vgx: '0',
    vgy: '0',
    vgz: '0',
    templ: '65',
    temph: '67',
    tof: '10',
    h: '0',
    bat: '100',
    baro: '60.16',
    time: '0',
    agx: '-20.00',
    agy: '-13.00',
    agz: '-1000.00',
  }
 */

export interface DroneStatus {
  mid: number
  x: number
  y: number
  z: number
  mpry: string
  pitch: number
  roll: number
  yaw: number
  vgx: number
  vgy: number
  vgz: number
  templ: number
  temph: number
  tof: number
  h: number
  bat: number
  baro: number
  time: number
  agx: number
  agy: number
  agz: number
}

type StatusChanges = {
  current: DroneStatus | {}
  previous: DroneStatus | {}
}

type Command = {
  text: string
  wait?: number
}

class Tello {
  private connected: boolean = false
  private client: dgram.Socket = dgram.createSocket('udp4')
  private statusClient: dgram.Socket = dgram.createSocket('udp4')
  private videoClient: dgram.Socket = dgram.createSocket('udp4')

  private liveLogger = console.log

  private executingCommand: string | null = null
  private queuedCommands: Command[] = []
  private status: StatusChanges = {
    current: {},
    previous: {},
  }

  constructor(commandFinishedCallback) {
    this.initializeCommandClient(commandFinishedCallback)
    this.initializeStatusClient()
    this.initializeVideoClient()
  }

  public isConnected = () => this.connected

  public initialize = async () => {
    this.liveLogger('Initializing drone connection')
    await this.command('command')
    await this.command('battery?')
  }

  private initializeCommandClient = commandFinishedCallback => {
    this.client.bind(CMD_PORT)
    this.client.on('message', msg => {
      this.liveLogger('Data received from server:')
      this.liveLogger(msg.toString())

      if (this.executingCommand === 'command') {
        this.connected = true
      }

      this.executingCommand = null
      if (this.liveLogger === console.log) {
        commandFinishedCallback()
      }
      this.executeQueuedCommand()
    })
  }

  private initializeStatusClient = () => {
    this.statusClient.bind(STATUS_PORT)
    this.statusClient.on('message', this.updateDroneStatus)
  }

  private initializeVideoClient = () => {
    this.videoClient = dgram.createSocket('udp4')
    this.videoClient.bind(CAMERA_PORT)
    this.videoClient.on('message', (msg, info) => {
      // console.log(msg.toString())
    })
  }

  private updateDroneStatus = (msg, info) => {
    const dataString = msg
      .toString()
      .split(';')
      .slice(0, -1)
    const status = {}
    dataString.forEach(dataPoint => {
      const dataPointTuple = dataPoint.split(':')
      if (dataPointTuple[0] === 'mpry') {
        status[dataPointTuple[0]] = dataPointTuple[1]
      } else {
        status[dataPointTuple[0]] = +dataPointTuple[1]
      }
    })

    this.status.previous = this.status.current
    this.status.current = status
  }

  setLogger(log: (value: string) => boolean) {
    this.liveLogger = log
  }

  public getStatus(): DroneStatus | {} {
    return this.status.current
  }

  uhoh() {
    this.command('emergency')
  }

  initiateTestFlight() {
    this.queuedCommands = [
      { text: 'takeoff', wait: 0 },
      { text: 'up 100', wait: 0 },
      { text: 'forward 250', wait: 0 },
      { text: 'cw 90', wait: 0 },
      { text: 'forward 250', wait: 0 },
      { text: 'cw 90', wait: 0 },
      { text: 'forward 250', wait: 0 },
      { text: 'cw 90', wait: 0 },
      { text: 'forward 250', wait: 0 },
      // { text: 'curve 25 25 25 25 25 25 10', wait: 500 },
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
      this.client.send(command, 0, command.length, CMD_PORT, HOST, (err, bytes) => {
        if (err) {
          reject(err)
        }

        resolve()
      })
    })
  }

  close() {
    this.client.close()
    this.statusClient.close()
    this.videoClient.close()
  }
}

export default Tello
