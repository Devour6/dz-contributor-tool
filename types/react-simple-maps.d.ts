declare module "react-simple-maps" {
  import { ComponentType, CSSProperties, ReactNode } from "react";

  interface ComposableMapProps {
    projection?: string;
    projectionConfig?: {
      scale?: number;
      center?: [number, number];
      rotate?: [number, number, number];
    };
    width?: number;
    height?: number;
    style?: CSSProperties;
    viewBox?: string;
    children?: ReactNode;
  }

  interface GeographiesProps {
    geography: string | object;
    children: (data: { geographies: GeographyType[] }) => ReactNode;
  }

  interface GeographyType {
    rsmKey: string;
    properties: Record<string, unknown>;
    type: string;
    geometry: object;
  }

  interface GeographyProps {
    geography: GeographyType;
    key?: string;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    style?: {
      default?: CSSProperties;
      hover?: CSSProperties;
      pressed?: CSSProperties;
    };
  }

  interface MarkerProps {
    coordinates: [number, number];
    key?: string;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    onClick?: () => void;
    children?: ReactNode;
  }

  interface LineProps {
    from: [number, number];
    to: [number, number];
    key?: string;
    stroke?: string;
    strokeWidth?: number;
    strokeOpacity?: number;
    strokeLinecap?: string;
  }

  export const ComposableMap: ComponentType<ComposableMapProps>;
  export const Geographies: ComponentType<GeographiesProps>;
  export const Geography: ComponentType<GeographyProps>;
  export const Marker: ComponentType<MarkerProps>;
  export const Line: ComponentType<LineProps>;
  export const ZoomableGroup: ComponentType<{
    center?: [number, number];
    zoom?: number;
    children?: ReactNode;
  }>;
}
