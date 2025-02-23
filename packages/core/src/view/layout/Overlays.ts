import Cell from '../cell/datatypes/Cell';
import CellOverlay from '../cell/CellOverlay';
import EventObject from '../event/EventObject';
import InternalEvent from '../event/InternalEvent';
import Image from '../image/ImageBox';
import InternalMouseEvent from '../event/InternalMouseEvent';
import Graph from '../Graph';

class Overlays {
  constructor(graph: Graph) {
    this.graph = graph;
  }

  graph: Graph;

  /*****************************************************************************
   * Group: Overlays
   *****************************************************************************/

  /**
   * Adds an {@link CellOverlay} for the specified cell. This method fires an
   * {@link addoverlay} event and returns the new {@link CellOverlay}.
   *
   * @param cell {@link mxCell} to add the overlay for.
   * @param overlay {@link mxCellOverlay} to be added for the cell.
   */
  addCellOverlay(cell: Cell, overlay: CellOverlay): CellOverlay {
    if (cell.overlays == null) {
      cell.overlays = [];
    }
    cell.overlays.push(overlay);

    // Immediately update the cell display if the state exists
    const state = this.getView().getState(cell);
    if (state != null) {
      this.cellRenderer.redraw(state);
    }

    this.fireEvent(
      new EventObject(InternalEvent.ADD_OVERLAY, 'cell', cell, 'overlay', overlay)
    );
    return overlay;
  }

  /**
   * Returns the array of {@link mxCellOverlays} for the given cell or null, if
   * no overlays are defined.
   *
   * @param cell {@link mxCell} whose overlays should be returned.
   */
  getCellOverlays(cell: Cell): CellOverlay[] | null {
    return cell.overlays;
  }

  /**
   * Removes and returns the given {@link CellOverlay} from the given cell. This
   * method fires a {@link removeoverlay} event. If no overlay is given, then all
   * overlays are removed using {@link removeOverlays}.
   *
   * @param cell {@link mxCell} whose overlay should be removed.
   * @param overlay Optional {@link CellOverlay} to be removed.
   */
  // removeCellOverlay(cell: mxCell, overlay: mxCellOverlay): mxCellOverlay;
  removeCellOverlay(cell: Cell, overlay: CellOverlay | null = null): any {
    if (overlay == null) {
      this.removeCellOverlays(cell);
    } else {
      const index = cell.overlays ? cell.overlays.indexOf(overlay) : -1;

      if (index >= 0) {
        (<CellOverlay[]>cell.overlays).splice(index, 1);

        if ((<CellOverlay[]>cell.overlays).length === 0) {
          cell.overlays = null;
        }

        // Immediately updates the cell display if the state exists
        const state = this.getView().getState(cell);

        if (state != null) {
          this.cellRenderer.redraw(state);
        }

        this.fireEvent(
          new EventObject(InternalEvent.REMOVE_OVERLAY, 'cell', cell, 'overlay', overlay)
        );
      } else {
        overlay = null;
      }
    }

    return overlay;
  }

  /**
   * Removes all {@link mxCellOverlays} from the given cell. This method
   * fires a {@link removeoverlay} event for each {@link CellOverlay} and returns
   * the array of {@link mxCellOverlays} that was removed from the cell.
   *
   * @param cell {@link mxCell} whose overlays should be removed
   */
  removeCellOverlays(cell: Cell): CellOverlay[] {
    const { overlays } = cell;

    if (overlays != null) {
      cell.overlays = null;

      // Immediately updates the cell display if the state exists
      const state = this.getView().getState(cell);

      if (state != null) {
        this.cellRenderer.redraw(state);
      }

      for (let i = 0; i < overlays.length; i += 1) {
        this.fireEvent(
          new EventObject(
            InternalEvent.REMOVE_OVERLAY,
            'cell',
            cell,
            'overlay',
            overlays[i]
          )
        );
      }
    }

    return <CellOverlay[]>overlays;
  }

  /**
   * Removes all {@link mxCellOverlays} in the graph for the given cell and all its
   * descendants. If no cell is specified then all overlays are removed from
   * the graph. This implementation uses {@link removeCellOverlays} to remove the
   * overlays from the individual cells.
   *
   * @param cell Optional {@link Cell} that represents the root of the subtree to
   * remove the overlays from. Default is the root in the model.
   */
  clearCellOverlays(cell: Cell = <Cell>this.getModel().getRoot()): void {
    this.removeCellOverlays(<Cell>cell);

    // Recursively removes all overlays from the children
    const childCount = cell.getChildCount();

    for (let i = 0; i < childCount; i += 1) {
      const child = cell.getChildAt(i);
      this.clearCellOverlays(<Cell>child); // recurse
    }
  }

  /**
   * Creates an overlay for the given cell using the warning and image or
   * {@link warningImage} and returns the new {@link CellOverlay}. The warning is
   * displayed as a tooltip in a red font and may contain HTML markup. If
   * the warning is null or a zero length string, then all overlays are
   * removed from the cell.
   *
   * @example
   * ```javascript
   * graph.setCellWarning(cell, '{@link b}Warning:</b>: Hello, World!');
   * ```
   *
   * @param cell {@link mxCell} whose warning should be set.
   * @param warning String that represents the warning to be displayed.
   * @param img Optional {@link Image} to be used for the overlay. Default is
   * {@link warningImage}.
   * @param isSelect Optional boolean indicating if a click on the overlay
   * should select the corresponding cell. Default is `false`.
   */
  setCellWarning(
    cell: Cell,
    warning: string | null = null,
    img: Image | null = null,
    isSelect: boolean = false
  ): CellOverlay | null {
    if (warning != null && warning.length > 0) {
      img = img != null ? img : this.warningImage;

      // Creates the overlay with the image and warning
      const overlay = new CellOverlay(img, `<font color=red>${warning}</font>`);

      // Adds a handler for single mouseclicks to select the cell
      if (isSelect) {
        overlay.addListener(
          InternalEvent.CLICK,
          (sender: any, evt: InternalMouseEvent) => {
            if (this.isEnabled()) {
              this.setSelectionCell(cell);
            }
          }
        );
      }

      // Sets and returns the overlay in the graph
      return this.addCellOverlay(cell, overlay);
    }
    this.removeCellOverlays(cell);

    return null;
  }
}

export default Overlays;
