import gamepad from 'gamepad'

import Tello from './tello'

let logger = console.log

const setLogger = (log: (value: string) => boolean) => {
  logger = log
}

type AxisState = {
  x: number
  y: number
  z: number
  yaw: number
}

const axisState = {
  x: 0,
  y: 0,
  z: 0,
  yaw: 0,
  moving: false,
  previous: null,
}

function sameState(previous: AxisState, current: AxisState): boolean {
  if (previous == null) return false

  return (
    previous.x === current.x && previous.y === current.y && previous.z === current.z && previous.yaw === current.yaw
  )
}

const initialize = (drone: Tello) => {
  gamepad.init()
  logger(`Number of connected devices: ${gamepad.numDevices()}`)

  setInterval(gamepad.processEvents, 16)
  setInterval(gamepad.detectDevices, 500)

  const actionMap = {
    move: {
      0: {
        4: value => {
          axisState.y = value
        },
        5: value => {
          axisState.x = value
        }, // Left and right
      },
      1: {
        4: value => {
          axisState.z = value
        }, // Up and down
        5: value => {
          axisState.yaw = value
        }, // Rotate
      },
    },
    up: {
      0: {
        2: () => drone.actions.takeOff(),
        1: () => drone.actions.land(),
        0: () => drone.command('rc 50 0 0 0'),
        3: () => drone.command('rc -50 0 0 0'),
      },
      1: {
        2: () => drone.command('flip f'),
        1: () => drone.command('flip b'),
        0: () => drone.command('flip l'),
        3: () => drone.command('flip r'),
        12: () => drone.uhoh(),
      },
    },
  }

  setInterval(() => {
    const { x, y, z, yaw, moving } = axisState

    if (x === 0 && y === 0 && z === 0 && yaw === 0) {
      if (!moving) return
      logger('Stoppin')
      axisState.moving = false
      axisState.previous = null
      return drone.command('rc 0 0 0 0')
    }

    if (sameState(axisState.previous, { x, y, z, yaw })) {
      logger('Same state')
      return
    }

    logger(`Going ${x}, ${y}, ${z}, ${yaw}`)
    axisState.moving = true
    axisState.previous = { x, y, z, yaw }

    drone.command(`rc ${-x * 100} ${-y * 100} ${z * 100} ${yaw * 100}`)
  }, 100)

  const executeAction = (type: string, device: number, axis: number, value?: number) => {
    actionMap[type][device][axis](value)
  }

  gamepad.on('move', function(id, axis, value) {
    executeAction('move', id, axis, value)
    logger(
      `move: ${JSON.stringify({
        id: id,
        axis: axis,
        value: value,
      })}`,
    )
  })

  gamepad.on('up', function(id, num) {
    executeAction('up', id, num)
    logger(
      `up: ${JSON.stringify({
        id: id,
        num: num,
      })}`,
    )
  })
}

export default { initialize, setLogger }
