/**
 * Copyright (c) 2006-2015, JGraph Ltd
 * Copyright (c) 2006-2015, Gaudenz Alder
 * Updated to ES9 syntax by David Morrissey 2021
 * Type definitions from the typed-mxgraph project
 */
import CellMarker from '../cell/CellMarker';
import InternalMouseEvent from './InternalMouseEvent';
import Graph from '../Graph';
import Cell from '../cell/datatypes/Cell';

/**
 * Event handler that highlights cells
 *
 * @example
 * ```javascript
 * new mxCellTracker(graph, '#00FF00');
 * ```
 *
 * For detecting dragEnter, dragOver and dragLeave on cells, the following code can be used:
 * @example
 * ```javascript
 * graph.addMouseListener(
 * {
 *   cell: null,
 *   mouseDown: function(sender, me) { },
 *   mouseMove: function(sender, me)
 *   {
 *     var tmp = me.getCell();
 *
 *     if (tmp != this.cell)
 *     {
 *       if (this.cell != null)
 *       {
 *         this.dragLeave(me.getEvent(), this.cell);
 *       }
 *
 *       this.cell = tmp;
 *
 *       if (this.cell != null)
 *       {
 *         this.dragEnter(me.getEvent(), this.cell);
 *       }
 *     }
 *
 *     if (this.cell != null)
 *     {
 *       this.dragOver(me.getEvent(), this.cell);
 *     }
 *   },
 *   mouseUp: function(sender, me) { },
 *   dragEnter: function(evt, cell)
 *   {
 *     mxLog.debug('dragEnter', cell.value);
 *   },
 *   dragOver: function(evt, cell)
 *   {
 *     mxLog.debug('dragOver', cell.value);
 *   },
 *   dragLeave: function(evt, cell)
 *   {
 *     mxLog.debug('dragLeave', cell.value);
 *   }
 * });
 * ```
 */
class CellTracker extends CellMarker {
  constructor(
    graph: Graph,
    color: string,
    funct: null | ((me: InternalMouseEvent) => Cell)=null
  ) {
    super(graph, color);

    this.graph.event.addMouseListener(this);

    if (funct != null) {
      this.getCell = funct;
    }
  }

  destroyed: boolean = false;

  /**
   * Ignores the event. The event is not consumed.
   */
  mouseDown(sender: any, me: InternalMouseEvent): void {}

  /**
   * Handles the event by highlighting the cell under the mousepointer if it
   * is over the hotspot region of the cell.
   */
  mouseMove(sender: any, me: InternalMouseEvent): void {
    if (this.isEnabled()) {
      this.process(me);
    }
  }

  /**
   * Handles the event by resetting the highlight.
   */
  mouseUp(sender: any, me: InternalMouseEvent): void {}

  /**
   * Function: destroy
   *
   * Destroys the object and all its resources and DOM nodes. This doesn't
   * normally need to be called. It is called automatically when the window
   * unloads.
   */
  destroy(): void {
    if (!this.destroyed) {
      this.destroyed = true;

      this.graph.event.removeMouseListener(this);
      super.destroy();
    }
  }
}

export default CellTracker;
