import Image from '../image/ImageBox';
import mxClient from '../../mxClient';
import Graph from '../Graph';
import CellState from '../cell/datatypes/CellState';
import Cell from '../cell/datatypes/Cell';
import CellArray from '../cell/datatypes/CellArray';
import EventObject from '../event/EventObject';
import InternalEvent from '../event/InternalEvent';
import Geometry from '../geometry/Geometry';
import { getValue, toRadians } from '../../util/Utils';
import Rectangle from '../geometry/Rectangle';

/**
 * GraphFoldingOptions
 *
 * @memberof GraphFolding
 * @typedef {object} GraphFoldingOptions
 * @property {boolean} foldingEnabled Specifies if folding (collapse and expand
 *                     via an image icon in the graph should be enabled).
 * @property {Image} collapsedImage Specifies the {@link Image} to indicate a collapsed state.
 *                     Default value is mxClient.imageBasePath + '/collapsed.gif'
 * @property {Image} expandedImage Specifies the {@link Image} to indicate a expanded state.
 *                     Default value is mxClient.imageBasePath + '/expanded.gif'
 * @property {collapseToPreferredSize} Specifies if the cell size should be changed to the preferred size when
 *                     a cell is first collapsed.
 */
type GraphFoldingOptions = {
  foldingEnabled: boolean;
  collapsedImage: Image;
  expandedImage: Image;
  collapseToPreferredSize: boolean;
};

class GraphFolding {
  constructor(
    graph: Graph,
    options: GraphFoldingOptions = {
      foldingEnabled: true,
      collapsedImage: new Image(`${mxClient.imageBasePath}/collapsed.gif`, 9, 9),
      expandedImage: new Image(`${mxClient.imageBasePath}/expanded.gif`, 9, 9),
      collapseToPreferredSize: true,
    }
  ) {
    this.graph = graph;
    this.options = options;
  }

  graph: Graph;
  options: GraphFoldingOptions;

  /**
   * Specifies the resource key for the tooltip on the collapse/expand icon.
   * If the resource for this key does not exist then the value is used as
   * the tooltip.
   * @default 'collapse-expand'
   */
  collapseExpandResource: string = mxClient.language != 'none' ? 'collapse-expand' : '';

  /**
   *
   * @default true
   */

  /**
   * Returns the cells which are movable in the given array of cells.
   */
  getFoldableCells(cells: CellArray, collapse: boolean = false): CellArray | null {
    return this.graph.model.filterCells(cells, (cell: Cell) => {
      return this.isCellFoldable(cell, collapse);
    });
  }

  /**
   * Returns true if the given cell is foldable. This implementation
   * returns true if the cell has at least one child and its style
   * does not specify {@link mxConstants.STYLE_FOLDABLE} to be 0.
   *
   * @param cell {@link mxCell} whose foldable state should be returned.
   */
  // isCellFoldable(cell: mxCell, collapse: boolean): boolean;
  isCellFoldable(cell: Cell, collapse: boolean = false): boolean {
    const style = this.getCurrentCellStyle(cell);
    return cell.getChildCount() > 0 && style.foldable != 0;
  }

  /**
   * Returns the {@link Image} used to display the collapsed state of
   * the specified cell state. This returns null for all edges.
   */
  getFoldingImage(state: CellState): Image | null {
    if (state != null && this.options.foldingEnabled && !state.cell.isEdge()) {
      const tmp = (<Cell>state.cell).isCollapsed();

      if (this.isCellFoldable(state.cell, !tmp)) {
        return tmp ? this.options.collapsedImage : this.options.expandedImage;
      }
    }
    return null;
  }

  /*****************************************************************************
   * Group: Folding
   *****************************************************************************/

  /**
   * Sets the collapsed state of the specified cells and all descendants
   * if recurse is true. The change is carried out using {@link cellsFolded}.
   * This method fires {@link InternalEvent.FOLD_CELLS} while the transaction is in
   * progress. Returns the cells whose collapsed state was changed.
   *
   * @param collapse Boolean indicating the collapsed state to be assigned.
   * @param recurse Optional boolean indicating if the collapsed state of all
   * descendants should be set. Default is `false`.
   * @param cells Array of {@link Cell} whose collapsed state should be set. If
   * null is specified then the foldable selection cells are used.
   * @param checkFoldable Optional boolean indicating of isCellFoldable should be
   * checked. Default is `false`.
   * @param evt Optional native event that triggered the invocation.
   */
  // foldCells(collapse: boolean, recurse: boolean, cells: mxCellArray, checkFoldable?: boolean, evt?: Event): mxCellArray;
  foldCells(
    collapse: boolean = false,
    recurse: boolean = false,
    cells: CellArray | null = null,
    checkFoldable: boolean = false,
    evt: EventObject | null = null
  ): CellArray | null {
    if (cells == null) {
      cells = this.getFoldableCells(this.getSelectionCells(), collapse);
    }

    this.stopEditing(false);

    this.graph.model.beginUpdate();
    try {
      this.cellsFolded(cells, collapse, recurse, checkFoldable);
      this.fireEvent(
        new EventObject(
          InternalEvent.FOLD_CELLS,
          'collapse',
          collapse,
          'recurse',
          recurse,
          'cells',
          cells
        )
      );
    } finally {
      this.graph.model.endUpdate();
    }
    return cells;
  }

  /**
   * Sets the collapsed state of the specified cells. This method fires
   * {@link InternalEvent.CELLS_FOLDED} while the transaction is in progress. Returns the
   * cells whose collapsed state was changed.
   *
   * @param cells Array of {@link Cell} whose collapsed state should be set.
   * @param collapse Boolean indicating the collapsed state to be assigned.
   * @param recurse Boolean indicating if the collapsed state of all descendants
   * should be set.
   * @param checkFoldable Optional boolean indicating of isCellFoldable should be
   * checked. Default is `false`.
   */
  // cellsFolded(cells: mxCellArray, collapse: boolean, recurse: boolean, checkFoldable?: boolean): void;
  cellsFolded(
    cells: CellArray | null = null,
    collapse: boolean = false,
    recurse: boolean = false,
    checkFoldable: boolean = false
  ): void {
    if (cells != null && cells.length > 0) {
      this.graph.model.beginUpdate();
      try {
        for (let i = 0; i < cells.length; i += 1) {
          if (
            (!checkFoldable || this.isCellFoldable(cells[i], collapse)) &&
            collapse !== cells[i].isCollapsed()
          ) {
            this.graph.model.setCollapsed(cells[i], collapse);
            this.swapBounds(cells[i], collapse);

            if (this.isExtendParent(cells[i])) {
              this.extendParent(cells[i]);
            }

            if (recurse) {
              const children = cells[i].getChildren();
              this.cellsFolded(children, collapse, recurse);
            }

            this.constrainChild(cells[i]);
          }
        }

        this.graph.fireEvent(
          new EventObject(
            InternalEvent.CELLS_FOLDED,
            'cells',
            cells,
            'collapse',
            collapse,
            'recurse',
            recurse
          )
        );
      } finally {
        this.graph.model.endUpdate();
      }
    }
  }

  /**
   * Swaps the alternate and the actual bounds in the geometry of the given
   * cell invoking {@link updateAlternateBounds} before carrying out the swap.
   *
   * @param cell {@link mxCell} for which the bounds should be swapped.
   * @param willCollapse Boolean indicating if the cell is going to be collapsed.
   */
  // swapBounds(cell: mxCell, willCollapse: boolean): void;
  swapBounds(cell: Cell, willCollapse: boolean = false): void {
    let geo = cell.getGeometry();
    if (geo != null) {
      geo = <Geometry>geo.clone();

      this.updateAlternateBounds(cell, geo, willCollapse);
      geo.swap();

      this.graph.model.setGeometry(cell, geo);
    }
  }

  /**
   * Updates or sets the alternate bounds in the given geometry for the given
   * cell depending on whether the cell is going to be collapsed. If no
   * alternate bounds are defined in the geometry and
   * {@link collapseToPreferredSize} is true, then the preferred size is used for
   * the alternate bounds. The top, left corner is always kept at the same
   * location.
   *
   * @param cell {@link mxCell} for which the geometry is being udpated.
   * @param g {@link mxGeometry} for which the alternate bounds should be updated.
   * @param willCollapse Boolean indicating if the cell is going to be collapsed.
   */
  // updateAlternateBounds(cell: mxCell, geo: mxGeometry, willCollapse: boolean): void;
  updateAlternateBounds(
    cell: Cell | null = null,
    geo: Geometry | null = null,
    willCollapse: boolean = false
  ): void {
    if (cell != null && geo != null) {
      const style = this.getCurrentCellStyle(cell);

      if (geo.alternateBounds == null) {
        let bounds = geo;

        if (this.options.collapseToPreferredSize) {
          const tmp = this.getPreferredSizeForCell(cell);

          if (tmp != null) {
            bounds = <Geometry>tmp;

            const startSize = getValue(style, 'startSize');

            if (startSize > 0) {
              bounds.height = Math.max(bounds.height, startSize);
            }
          }
        }

        geo.alternateBounds = new Rectangle(0, 0, bounds.width, bounds.height);
      }

      if (geo.alternateBounds != null) {
        geo.alternateBounds.x = geo.x;
        geo.alternateBounds.y = geo.y;

        const alpha = toRadians(style.rotation || 0);

        if (alpha !== 0) {
          const dx = geo.alternateBounds.getCenterX() - geo.getCenterX();
          const dy = geo.alternateBounds.getCenterY() - geo.getCenterY();

          const cos = Math.cos(alpha);
          const sin = Math.sin(alpha);

          const dx2 = cos * dx - sin * dy;
          const dy2 = sin * dx + cos * dy;

          geo.alternateBounds.x += dx2 - dx;
          geo.alternateBounds.y += dy2 - dy;
        }
      }
    }
  }
}

export default GraphFolding;
