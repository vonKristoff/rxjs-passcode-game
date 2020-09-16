import { of, fromEvent, BehaviorSubject, interval, never } from 'rxjs'; 
import { scan, flatMap, reduce, map, merge, tap, filter, take, withLatestFrom, switchMap } from 'rxjs/operators';

const startBtn = document.querySelector('.start')
const counter = document.querySelector('.countdown')
const f1 = document.querySelector('.field-1')
const f2 = document.querySelector('.field-2')
const f3 = document.querySelector('.field-3')
const f4 = document.querySelector('.field-4')

const keyelms = [f1,f2,f3,f4] 
let passcode = []

startBtn.addEventListener('click', () => {
  gameState.next("PLAY")
  passcode = genPasscode()
})

const MAX_CODE = 4

const gameState = new BehaviorSubject("INIT")
const timer$ = interval(1000)

function genPasscode() {
  const code = []
  for(let i=0; i< MAX_CODE; i++) {
    code.push(Math.floor(Math.random()*10))
  }
  console.log("NEW CODE", code)
  return code
}


const keypresses$ = fromEvent(document, 'keyup').pipe(
  map(e => e.key)
)

const cycle$ = keypresses$.pipe(
  scan((state, key) => {
    const count = state.count + 1
    const column = count % MAX_CODE
    return { key, count, column }
  }, { key: "", count: -1, column: 0 })
  
)

setTimeout(() => {
  gameState.next('STOP')
},3000)

const engine$ = gameState.pipe(
  switchMap(mode => mode === "PLAY" ? timer$ : never())
)

const countdown$ = engine$.pipe(
  withLatestFrom(gameState),
  scan((count, [tick, mode]) => {
    const newCount = 20
    if(mode === "PLAY") newCount = count - 1
    return newCount
  }, 20),
  tap(count => {
    if (count === 0) gameState.next("DEAD")
  }),
  tap(count => counter.innerHTML = count)
)

const cracker$ = cycle$.pipe(
  scan((state, turn) => {
    const newState = turn.column === 0 
      ? [false, false, false, false]
      : [...state]
    let num = passcode[turn.column]
    const match = num === parseInt(turn.key)
    const cracked = match 
      ? `match` 
      : contains(turn.key)

    newState[turn.column] = { cracked, key:turn.key }
    return newState
  }, []),
  tap(renderKeys)
)

function contains(key) {
  const num = parseInt(key)
  return passcode.includes(num) ? `group` : false
}

function renderKeys(keys) {
  keys.forEach((press, col) => {
    console.log(col)
    let tgt = keyelms[col]
    tgt.classList.remove("group", "match")
    if(press) {
      if(press.cracked) tgt.classList.add(press.cracked)
      tgt.innerHTML = press.key
    } else {
      tgt.innerHTML = ""
    }
  })
}

  
const win$ = cracker$.pipe(
  scan((accum, feed) => {
    return feed.filter(val => {
      return val.cracked === "match"
    }).length === MAX_CODE
  }, false),
  tap(handleCrackedCode)
)

countdown$.subscribe()
win$.subscribe()

function handleCrackedCode(wins) {
  if(wins) {
    gameState.next("WIN")
    console.log("WINNER")
  }
}