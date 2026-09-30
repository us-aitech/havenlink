import { Bath, BedDouble, Car, ChefHat, DoorOpen, Film, Home, Monitor, Moon, Plane, Shirt, Sofa, Sunrise, Trees, type LucideIcon } from 'lucide-react'
import type { RoomIcon, SceneIcon } from '@/types'

export const ROOM_ICONS: Record<RoomIcon, LucideIcon> = {
  sofa: Sofa,
  chef: ChefHat,
  bed: BedDouble,
  bath: Bath,
  car: Car,
  tree: Trees,
  door: DoorOpen,
  shirt: Shirt,
  monitor: Monitor,
}

export const SCENE_ICONS: Record<SceneIcon, LucideIcon> = {
  sunrise: Sunrise,
  moon: Moon,
  plane: Plane,
  film: Film,
  home: Home,
}
