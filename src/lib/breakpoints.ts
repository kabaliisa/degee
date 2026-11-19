import { useWindowDimensions } from 'react-native';

/**
 * React Native has no media queries, so width is read at runtime and the layout branches on it.
 *
 * The two numbers are where the phone layout stops paying its way. Below 760 a sidebar would eat
 * the content; below 1100 a three-column grid leaves cards too narrow to read a title in. They are
 * deliberately not device names: a phone held sideways and a small tablet want the same thing.
 */
export const BREAKPOINTS = { wide: 760, wider: 1100 } as const;

export type Layout = {
  /** Narrow: one column, tab bar at the bottom, the layout the app was built for. */
  phone: boolean;
  /** 760 and up: sidebar instead of a tab bar, content in a pane of its own. */
  wide: boolean;
  /** 1100 and up: room for more columns in a grid. */
  wider: boolean;
  width: number;
  /** How many cards fit across a shelf at this width. */
  columns: number;
};

export function useLayout(): Layout {
  const { width } = useWindowDimensions();
  const wide = width >= BREAKPOINTS.wide;
  const wider = width >= BREAKPOINTS.wider;
  return {
    phone: !wide,
    wide,
    wider,
    width,
    columns: wider ? (width >= 1500 ? 6 : 5) : wide ? 3 : 2,
  };
}
