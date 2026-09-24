import { register } from '../core/registry'
import figuras from './figuras'
import ingles from './ingles'
import laberinto from './laberinto'
import lengua from './lengua'
import logica from './logica'
import mates from './mates'

register(...mates, ...lengua, ...ingles, ...logica, ...laberinto, ...figuras)
