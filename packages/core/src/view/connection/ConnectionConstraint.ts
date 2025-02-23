/**
 * Copyright (c) 2006-2015, JGraph Ltd
 * Copyright (c) 2006-2015, Gaudenz Alder
 * Updated to ES9 syntax by David Morrissey 2021
 * Type definitions from the typed-mxgraph project
 */

import Point from '../geometry/Point';

/**
 * Defines an object that contains the constraints about how to connect one side of an edge to its terminal.
 * @class ConnectionConstraint
 */
class ConnectionConstraint {
  constructor(
    point: Point | null = null,
    perimeter: boolean = true,
    name: string | null = null,
    dx: number | null = null,
    dy: number | null = null
  ) {
    this.point = point;
    this.perimeter = perimeter != null ? perimeter : true;
    this.name = name;
    this.dx = dx || 0;
    this.dy = dy || 0;
  }

  /**
   * Variable: point
   *
   * <mxPoint> that specifies the fixed location of the connection point.
   */
  point: Point | null = null;

  /**
   * Variable: perimeter
   *
   * Boolean that specifies if the point should be projected onto the perimeter
   * of the terminal.
   */
  perimeter: boolean = true;

  /**
   * Variable: name
   *
   * Optional string that specifies the name of the constraint.
   */
  name: string | null = null;

  /**
   * Variable: dx
   *
   * Optional float that specifies the horizontal offset of the constraint.
   */
  dx: number | null = null;

  /**
   * Variable: dy
   *
   * Optional float that specifies the vertical offset of the constraint.
   */
  dy: number | null = null;
}

export default ConnectionConstraint;
