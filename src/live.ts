import * as contrib from 'blessed-contrib'
import blessed from 'blessed'

import DonutData = contrib.Widgets.DonutData
import BarData = contrib.Widgets.BarData
import LogElement = contrib.Widgets.LogElement
import BarElement = contrib.Widgets.BarElement
import DonutElement = contrib.Widgets.DonutElement
import MarkdownElement = contrib.Widgets.MarkdownElement
import LineElement = contrib.Widgets.LineElement

import { DroneStatus } from './tello'

const createDonut = (label: string, value: number, high: boolean): DonutData => {
  const donut = { label, percent: `${value}`, color: null }

  if (high) {
    if (value < 25) donut.color = 'red'
    else if (value < 50) donut.color = 'yellow'
    else if (value < 75) donut.color = 'yellow'
    else donut.color = 'green'
  } else {
    if (value < 25) donut.color = 'green'
    else if (value < 50) donut.color = 'yellow'
    else if (value < 75) donut.color = 'yellow'
    else donut.color = 'red'
  }

  return donut
}

const droneToDonuts = (status: DroneStatus): DonutData[] => {
  return [createDonut('battery', status.bat, true), createDonut('temp', status.temph, false)]
}

const sign = (value: number): '+' | '-' => (value < 0 ? '-' : '+')

const droneToAxisBars = (status: DroneStatus): BarData => {
  const titles = [`pitch${sign(status.pitch)}`, `roll${sign(status.pitch)}`, `yaw${sign(status.pitch)}`]
  const data = [Math.abs(status.pitch), Math.abs(status.roll), Math.abs(status.yaw)]

  return { titles, data }
}

const droneToRawValuesMarkdown = (status: DroneStatus): string => {
  const keys = Object.keys(status)
  return `${keys.map(key => `${key}: ${status[key]}`).join('\n')}`
}

const speedLabels = Array(10).fill('.')
const sharedGraphOptions = {
  style: { line: 'yellow', baseline: 'black' },
  wholeNumbersOnly: true,
  minY: -100,
  maxY: 100,
}

const xSpeedHistory = Array(10).fill(0)
const droneToUpdatedXSpeedhistory = (status: DroneStatus) => {
  xSpeedHistory.shift()
  xSpeedHistory.push(status.vgx)
  const graph = { title: null, x: speedLabels, y: xSpeedHistory }
  return [graph]
}

const ySpeedHistory = Array(10).fill(0)
const droneToUpdatedYSpeedhistory = (status: DroneStatus) => {
  ySpeedHistory.shift()
  ySpeedHistory.push(status.vgy)
  const graph = { title: null, x: speedLabels, y: ySpeedHistory }
  return [graph]
}

const zSpeedHistory = Array(10).fill(0)
const droneToUpdatedZSpeedhistory = (status: DroneStatus) => {
  zSpeedHistory.shift()
  zSpeedHistory.push(status.vgz)
  const graph = { title: null, x: speedLabels, y: zSpeedHistory }
  return [graph]
}

let timer = null
const start = drone => {
  if (drone.getStatus() === {}) {
    throw Error('Drone not ready')
  }

  const screen = blessed.screen()
  const grid = new contrib.grid({ rows: 12, cols: 12, screen: screen })
  const donuts: DonutElement = grid.set(0, 0, 3, 4, contrib.donut, {
    label: 'Health',
    radius: 10,
    arcWidth: 3,
    remainColor: 'black',
    yPadding: 2,
  })
  const axisBars: BarElement = grid.set(0, 4, 4, 4, contrib.bar, {
    label: 'Orientation',
    barWidth: 8,
    barSpacing: 4,
    xOffset: 0,
    maxHeight: 180,
  })
  const log: LogElement = grid.set(6, 8, 6, 4, contrib.log, {
    fg: 'white',
    selectedFg: 'green',
    label: 'Output',
  })
  const xGraph: LineElement = grid.set(3, 0, 3, 4, contrib.line, {
    ...sharedGraphOptions,
    label: 'X speed',
  })
  const yGraph: LineElement = grid.set(6, 0, 3, 4, contrib.line, {
    ...sharedGraphOptions,
    label: 'Y speed',
  })
  const zGraph: LineElement = grid.set(9, 0, 3, 4, contrib.line, {
    ...sharedGraphOptions,
    label: 'Z speed',
  })
  const rawData: MarkdownElement = grid.set(0, 8, 6, 4, contrib.markdown, { label: 'Raw values' })

  screen.render()

  timer = setInterval(() => {
    const status = drone.getStatus()

    // @ts-ignore
    rawData.setMarkdown(droneToRawValuesMarkdown(status))
    donuts.setData(droneToDonuts(status))
    axisBars.setData(droneToAxisBars(status))
    xGraph.setData(droneToUpdatedXSpeedhistory(status))
    yGraph.setData(droneToUpdatedYSpeedhistory(status))
    zGraph.setData(droneToUpdatedZSpeedhistory(status))
    screen.render()
  }, 16)

  return (value: string) => {
    return log.log(value)
  }
}

const stop = () => {}

export default { start, stop }
