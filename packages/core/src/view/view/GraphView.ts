/**
 * Copyright (c) 2006-2015, JGraph Ltd
 * Copyright (c) 2006-2015, Gaudenz Alder
 * Updated to ES9 syntax by David Morrissey 2021
 * Type definitions from the typed-mxgraph project
 */

import Point from '../geometry/Point';
import Rectangle from '../geometry/Rectangle';
import Dictionary from '../../util/Dictionary';
import EventSource from '../event/EventSource';
import EventObject from '../event/EventObject';
import RectangleShape from '../geometry/shape/node/RectangleShape';
import {
  ALIGN_BOTTOM,
  ALIGN_CENTER,
  ALIGN_LEFT,
  ALIGN_MIDDLE,
  ALIGN_RIGHT,
  ALIGN_TOP,
} from '../../util/Constants';
import mxClient from '../../mxClient';
import InternalEvent from '../event/InternalEvent';
import {
  convertPoint,
  getCurrentStyle,
  getOffset,
  getRotatedPoint,
  getValue,
  ptSegDistSq,
  relativeCcw,
  toRadians,
} from '../../util/Utils';
import mxLog from '../../util/gui/mxLog';
import Resources from '../../util/Resources';
import CellState from '../cell/datatypes/CellState';
import UndoableEdit from '../model/UndoableEdit';
import ImageShape from '../geometry/shape/node/ImageShape';
import InternalMouseEvent from '../event/InternalMouseEvent';
import StyleRegistry from '../style/StyleRegistry';
import graph from '../Graph';
import Cell from '../cell/datatypes/Cell';
import Image from '../image/ImageBox';
import CurrentRootChange from './CurrentRootChange';
import Model from '../model/Model';
import Shape from '../geometry/shape/Shape';
import Geometry from '../geometry/Geometry';
import ConnectionConstraint from '../connection/ConnectionConstraint';
import PopupMenuHandler from '../popups_menus/PopupMenuHandler';
import { getClientX, getClientY, getSource, isConsumed } from '../../util/EventUtils';
import { clone } from '../../util/CloneUtils';
import CellArray from '../cell/datatypes/CellArray';

/**
 * @class GraphView
 * @extends {EventSource}
 *
 * Extends {@link EventSource} to implement a view for a graph. This class is in
 * charge of computing the absolute coordinates for the relative child
 * geometries, the points for perimeters and edge styles and keeping them
 * cached in {@link mxCellStates} for faster retrieval. The states are updated
 * whenever the model or the view state (translate, scale) changes. The scale
 * and translate are honoured in the bounds.
 *
 * #### Event: mxEvent.UNDO
 *
 * Fires after the root was changed in {@link setCurrentRoot}. The `edit`
 * property contains the {@link UndoableEdit} which contains the
 * {@link CurrentRootChange}.
 *
 * #### Event: mxEvent.SCALE_AND_TRANSLATE
 *
 * Fires after the scale and translate have been changed in {@link scaleAndTranslate}.
 * The `scale`, `previousScale`, `translate`
 * and `previousTranslate` properties contain the new and previous
 * scale and translate, respectively.
 *
 * #### Event: mxEvent.SCALE
 *
 * Fires after the scale was changed in {@link setScale}. The `scale` and
 * `previousScale` properties contain the new and previous scale.
 *
 * #### Event: mxEvent.TRANSLATE
 *
 * Fires after the translate was changed in {@link setTranslate}. The
 * `translate` and `previousTranslate` properties contain
 * the new and previous value for translate.
 *
 * #### Event: mxEvent.DOWN and mxEvent.UP
 *
 * Fire if the current root is changed by executing an {@link CurrentRootChange}.
 * The event name depends on the location of the root in the cell hierarchy
 * with respect to the current root. The `root` and
 * `previous` properties contain the new and previous root,
 * respectively.
 */
class GraphView extends EventSource {
  constructor(graph: graph) {
    super();

    this.graph = graph;
  }

  // TODO: Document me!
  backgroundImage: ImageShape | null = null;

  backgroundPageShape: Shape | null = null;

  EMPTY_POINT = new Point();

  canvas: SVGElement | null = null;

  backgroundPane: SVGElement | null = null;

  drawPane: SVGElement | null = null;

  overlayPane: SVGElement | null = null;

  decoratorPane: SVGElement | null = null;

  /**
   * Specifies the resource key for the status message after a long operation.
   * If the resource for this key does not exist then the value is used as
   * the status message. Default is 'done'.
   */
  doneResource = mxClient.language !== 'none' ? 'done' : '';

  /**
   * Specifies the resource key for the status message while the document is
   * being updated. If the resource for this key does not exist then the
   * value is used as the status message. Default is 'updatingDocument'.
   */
  updatingDocumentResource = mxClient.language !== 'none' ? 'updatingDocument' : '';

  /**
   * Specifies if string values in cell styles should be evaluated using
   * {@link eval}. This will only be used if the string values can't be mapped
   * to objects using {@link StyleRegistry}. Default is false. NOTE: Enabling this
   * switch carries a possible security risk.
   */
  allowEval = false;

  /**
   * Specifies if a gesture should be captured when it goes outside of the
   * graph container. Default is true.
   */
  captureDocumentGesture = true;

  /**
   * Specifies if shapes should be created, updated and destroyed using the
   * methods of {@link cellRenderer} in {@link graph}. Default is true.
   */
  rendering = true;

  /**
   * Reference to the enclosing {@link graph}.
   */
  graph: graph;

  /**
   * {@link Cell} that acts as the root of the displayed cell hierarchy.
   */
  currentRoot: Cell | null = null;

  graphBounds = new Rectangle();

  scale = 1;

  /**
   * {@link Point} that specifies the current translation. Default is a new
   * empty {@link Point}.
   */
  translate = new Point();

  states = new Dictionary<string, CellState>();

  /**
   * Specifies if the style should be updated in each validation step. If this
   * is false then the style is only updated if the state is created or if the
   * style of the cell was changed. Default is false.
   */
  updateStyle = false;

  /**
   * During validation, this contains the last DOM node that was processed.
   */
  lastNode: HTMLElement | SVGElement | null = null;

  /**
   * During validation, this contains the last HTML DOM node that was processed.
   */
  lastHtmlNode: HTMLElement | SVGElement | null = null;

  /**
   * During validation, this contains the last edge's DOM node that was processed.
   */
  lastForegroundNode: HTMLElement | SVGElement | null = null;

  /**
   * During validation, this contains the last edge HTML DOM node that was processed.
   */
  lastForegroundHtmlNode: HTMLElement | SVGElement | null = null;

  /**
   * Returns {@link graphBounds}.
   */
  getGraphBounds() {
    return this.graphBounds;
  }

  /**
   * Sets {@link graphBounds}.
   */
  setGraphBounds(value: Rectangle) {
    this.graphBounds = value;
  }

  /**
   * Returns the {@link scale}.
   */
  getScale() {
    return this.scale;
  }

  /**
   * Sets the scale and fires a {@link scale} event before calling {@link revalidate} followed
   * by {@link graph.sizeDidChange}.
   *
   * @param value Decimal value that specifies the new scale (1 is 100%).
   */
  setScale(value: number) {
    const previousScale: number = this.scale;
    if (previousScale !== value) {
      this.scale = value;
      if (this.isEventsEnabled()) {
        this.viewStateChanged();
      }
    }
    this.fireEvent(
      new EventObject(InternalEvent.SCALE, 'scale', value, 'previousScale', previousScale)
    );
  }

  /**
   * Returns the {@link translate}.
   */
  getTranslate() {
    return this.translate;
  }

  isRendering() {
    return this.rendering;
  }

  setRendering(value: boolean) {
    this.rendering = value;
  }

  /**
   * Sets the translation and fires a {@link translate} event before calling
   * {@link revalidate} followed by {@link graph.sizeDidChange}. The translation is the
   * negative of the origin.
   *
   * @param dx X-coordinate of the translation.
   * @param dy Y-coordinate of the translation.
   */
  setTranslate(dx: number, dy: number) {
    const previousTranslate = new Point(this.translate.x, this.translate.y);

    if (this.translate.x !== dx || this.translate.y !== dy) {
      this.translate.x = dx;
      this.translate.y = dy;

      if (this.isEventsEnabled()) {
        this.viewStateChanged();
      }
    }

    this.fireEvent(
      new EventObject(InternalEvent.TRANSLATE, {
        translate: this.translate,
        previousTranslate: previousTranslate,
      })
    );
  }

  isAllowEval() {
    return this.allowEval;
  }

  setAllowEval(value: boolean) {
    this.allowEval = value;
  }

  /**
   * Returns {@link states}.
   */
  getStates(): Dictionary<string, CellState> {
    return this.states;
  }

  /**
   * Sets {@link states}.
   */
  setStates(value: Dictionary<string, CellState>): void {
    this.states = value;
  }

  /**
   * Returns the DOM node that contains the background-, draw- and
   * overlay- and decoratorpanes.
   */
  getCanvas(): SVGElement | null {
    return this.canvas;
  }

  /**
   * Returns the DOM node that represents the background layer.
   */
  getBackgroundPane(): SVGElement | null {
    return this.backgroundPane;
  }

  /**
   * Returns the DOM node that represents the main drawing layer.
   */
  getDrawPane(): SVGElement | null {
    return this.drawPane;
  }

  /**
   * Returns the DOM node that represents the layer above the drawing layer.
   */
  getOverlayPane(): SVGElement | null {
    return this.overlayPane;
  }

  /**
   * Returns the DOM node that represents the topmost drawing layer.
   */
  getDecoratorPane(): SVGElement | null {
    return this.decoratorPane;
  }

  /**
   * Returns the union of all {@link mxCellStates} for the given array of {@link Cell}.
   *
   * @param cells Array of {@link Cell} whose bounds should be returned.
   */
  getBounds(cells: CellArray): Rectangle | null {
    let result = null;

    if (cells != null && cells.length > 0) {
      for (let i = 0; i < cells.length; i += 1) {
        if (cells[i].isVertex() || cells[i].isEdge()) {
          const state = this.getState(cells[i]);

          if (state != null) {
            if (result == null) {
              result = Rectangle.fromRectangle(state);
            } else {
              result.add(state);
            }
          }
        }
      }
    }
    return result;
  }

  /**
   * Sets and returns the current root and fires an {@link undo} event before
   * calling {@link graph.sizeDidChange}.
   *
   * @param root {@link mxCell} that specifies the root of the displayed cell hierarchy.
   */
  setCurrentRoot(root: Cell | null): Cell | null {
    if (this.currentRoot != root) {
      const change = new CurrentRootChange(this, <Cell>root);
      change.execute();

      const edit = new UndoableEdit(this, true);
      edit.add(change);

      this.fireEvent(new EventObject(InternalEvent.UNDO, 'edit', edit));
      (<graph>this.graph).sizeDidChange();

      this.currentRoot = root;
    }
    return root;
  }

  /**
   * Sets the scale and translation and fires a {@link scale} and {@link translate} event
   * before calling {@link revalidate} followed by {@link graph.sizeDidChange}.
   *
   * @param scale Decimal value that specifies the new scale (1 is 100%).
   * @param dx X-coordinate of the translation.
   * @param dy Y-coordinate of the translation.
   */
  scaleAndTranslate(scale: number, dx: number, dy: number): void {
    const previousScale = this.scale;
    const previousTranslate = new Point(this.translate.x, this.translate.y);

    if (this.scale != scale || this.translate.x != dx || this.translate.y != dy) {
      this.scale = scale;

      this.translate.x = dx;
      this.translate.y = dy;

      if (this.isEventsEnabled()) {
        this.viewStateChanged();
      }
    }

    this.fireEvent(
      new EventObject(InternalEvent.SCALE_AND_TRANSLATE, {
        scale: scale,
        previousScale: previousScale,
        translate: this.translate,
        previousTranslate: previousTranslate,
      })
    );
  }

  /**
   * Invoked after {@link scale} and/or {@link translate} has changed.
   */
  viewStateChanged(): void {
    this.revalidate();
    (<graph>this.graph).sizeDidChange();
  }

  /**
   * Clears the view if {@link currentRoot} is not null and revalidates.
   */
  refresh(): void {
    if (this.currentRoot != null) {
      this.clear();
    }
    this.revalidate();
  }

  /**
   * Revalidates the complete view with all cell states.
   */
  revalidate(): void {
    this.invalidate();
    this.validate();
  }

  /**
   * Removes the state of the given cell and all descendants if the given
   * cell is not the current root.
   *
   * @param cell Optional {@link Cell} for which the state should be removed. Default
   * is the root of the model.
   * @param force Boolean indicating if the current root should be ignored for
   * recursion.
   */
  clear(cell?: Cell | null, force: boolean = false, recurse: boolean = true): void {
    if (!cell) {
      cell = this.graph.getModel().getRoot();
    }

    if (cell) {
      this.removeState(cell);

      if (recurse && (force || cell !== this.currentRoot)) {
        const childCount: number = cell.getChildCount();

        for (let i = 0; i < childCount; i += 1) {
          this.clear(cell.getChildAt(i), force);
        }
      } else {
        this.invalidate(cell);
      }
    }
  }

  /**
   * Invalidates the state of the given cell, all its descendants and
   * connected edges.
   *
   * @param cell Optional {@link Cell} to be invalidated. Default is the root of the
   * model.
   */
  invalidate(
    cell: Cell | null = null,
    recurse: boolean = true,
    includeEdges: boolean = true
  ): void {
    const model: Model = (<graph>this.graph).getModel();
    const state: CellState = <CellState>this.getState(cell);

    cell = <Cell>(cell || model.getRoot());

    if (state != null) {
      state.invalid = true;
    }

    // Avoids infinite loops for invalid graphs
    if (!cell.invalidating) {
      cell.invalidating = true;

      // Recursively invalidates all descendants
      if (recurse) {
        const childCount = cell.getChildCount();

        for (let i = 0; i < childCount; i += 1) {
          const child = cell.getChildAt(i);
          this.invalidate(child, recurse, includeEdges);
        }
      }

      // Propagates invalidation to all connected edges
      if (includeEdges) {
        const edgeCount = cell.getEdgeCount();

        for (let i = 0; i < edgeCount; i += 1) {
          this.invalidate(cell.getEdgeAt(i), recurse, includeEdges);
        }
      }

      cell.invalidating = false;
    }
  }

  /**
   * Calls {@link validateCell} and {@link validateCellState} and updates the {@link graphBounds}
   * using {@link getBoundingBox}. Finally the background is validated using
   * {@link validateBackground}.
   *
   * @param cell Optional {@link Cell} to be used as the root of the validation.
   * Default is {@link currentRoot} or the root of the model.
   */
  validate(cell: Cell | null = null): void {
    const t0 = mxLog.enter('mxGraphView.validate');
    window.status =
      Resources.get(this.updatingDocumentResource) || this.updatingDocumentResource;

    this.resetValidationState();

    const graphBounds = this.getBoundingBox(
      this.validateCellState(
        <Cell>(
          this.validateCell(
            <Cell>(
              (cell ||
                (this.currentRoot != null
                  ? this.currentRoot
                  : (<graph>this.graph).getModel().getRoot()))
            )
          )
        )
      )
    );

    this.setGraphBounds(graphBounds != null ? graphBounds : this.getEmptyBounds());
    this.validateBackground();

    this.resetValidationState();

    window.status = Resources.get(this.doneResource) || this.doneResource;
    mxLog.leave('mxGraphView.validate', t0);
  }

  /**
   * Returns the bounds for an empty graph. This returns a rectangle at
   * {@link translate} with the size of 0 x 0.
   */
  getEmptyBounds(): Rectangle {
    return new Rectangle(this.translate.x * this.scale, this.translate.y * this.scale);
  }

  /**
   * Returns the bounding box of the shape and the label for the given
   * {@link CellState} and its children if recurse is true.
   *
   * @param state {@link mxCellState} whose bounding box should be returned.
   * @param recurse Optional boolean indicating if the children should be included.
   * Default is true.
   */
  getBoundingBox(
    state: CellState | null = null,
    recurse: boolean = true
  ): Rectangle | null {
    let bbox = null;

    if (state != null) {
      if (state.shape != null && state.shape.boundingBox != null) {
        bbox = state.shape.boundingBox.clone();
      }

      // Adds label bounding box to graph bounds
      if (state.text != null && state.text.boundingBox != null) {
        if (bbox != null) {
          bbox.add(state.text.boundingBox);
        } else {
          bbox = state.text.boundingBox.clone();
        }
      }

      if (recurse) {
        const model = (<graph>this.graph).getModel();
        const childCount = state.cell.getChildCount();

        for (let i = 0; i < childCount; i += 1) {
          const bounds = this.getBoundingBox(this.getState(state.cell.getChildAt(i)));

          if (bounds != null) {
            if (bbox == null) {
              bbox = bounds;
            } else {
              bbox.add(bounds);
            }
          }
        }
      }
    }
    return bbox;
  }

  /**
   * Creates and returns the shape used as the background page.
   *
   * @param bounds {@link mxRectangle} that represents the bounds of the shape.
   */
  createBackgroundPageShape(bounds: Rectangle): RectangleShape {
    return new RectangleShape(bounds, 'white', 'black');
  }

  /**
   * Calls {@link validateBackgroundImage} and {@link validateBackgroundPage}.
   */
  validateBackground(): void {
    this.validateBackgroundImage();
    this.validateBackgroundPage();
  }

  /**
   * Validates the background image.
   */
  validateBackgroundImage(): void {
    const bg = (<graph>this.graph).getBackgroundImage();

    if (bg != null) {
      if (this.backgroundImage == null || this.backgroundImage.imageSrc !== bg.src) {
        if (this.backgroundImage != null) {
          this.backgroundImage.destroy();
        }

        const bounds = new Rectangle(0, 0, 1, 1);

        this.backgroundImage = new ImageShape(bounds, bg.src);
        this.backgroundImage.dialect = (<graph>this.graph).dialect;
        this.backgroundImage.init(this.backgroundPane);
        this.backgroundImage.redraw();
      }

      this.redrawBackgroundImage(this.backgroundImage, bg);
    } else if (this.backgroundImage != null) {
      this.backgroundImage.destroy();
      this.backgroundImage = null;
    }
  }

  /**
   * Validates the background page.
   */
  validateBackgroundPage(): void {
    const graph = <graph>this.graph;

    if (graph.pageVisible) {
      const bounds = this.getBackgroundPageBounds();

      if (this.backgroundPageShape == null) {
        this.backgroundPageShape = this.createBackgroundPageShape(bounds);
        this.backgroundPageShape.scale = this.scale;
        this.backgroundPageShape.isShadow = true;
        this.backgroundPageShape.dialect = (<graph>this.graph).dialect;
        this.backgroundPageShape.init(this.backgroundPane);
        this.backgroundPageShape.redraw();

        if (this.backgroundPageShape.node) {
          // Adds listener for double click handling on background
          if (graph.nativeDblClickEnabled) {
            InternalEvent.addListener(this.backgroundPageShape.node, 'dblclick', ((
              evt: MouseEvent
            ) => {
              graph.dblClick(evt);
            }) as EventListener);
          }

          // Adds basic listeners for graph event dispatching outside of the
          // container and finishing the handling of a single gesture
          InternalEvent.addGestureListeners(
            this.backgroundPageShape.node,
            (evt: Event) => {
              graph.fireMouseEvent(InternalEvent.MOUSE_DOWN, new InternalMouseEvent(evt));
            },
            (evt: Event) => {
              // Hides the tooltip if mouse is outside container
              if (graph.tooltipHandler != null && graph.tooltipHandler.isHideOnHover()) {
                graph.tooltipHandler.hide();
              }

              if (graph.isMouseDown && !isConsumed(evt)) {
                graph.fireMouseEvent(
                  InternalEvent.MOUSE_MOVE,
                  new InternalMouseEvent(evt)
                );
              }
            },
            (evt: Event) => {
              graph.fireMouseEvent(InternalEvent.MOUSE_UP, new InternalMouseEvent(evt));
            }
          );
        }
      } else {
        this.backgroundPageShape.scale = this.scale;
        this.backgroundPageShape.bounds = bounds;
        this.backgroundPageShape.redraw();
      }
    } else if (this.backgroundPageShape != null) {
      this.backgroundPageShape.destroy();
      this.backgroundPageShape = null;
    }
  }

  /**
   * Returns the bounds for the background page.
   */
  getBackgroundPageBounds(): Rectangle {
    const fmt = (<graph>this.graph).pageFormat;
    const ps = this.scale * (<graph>this.graph).pageScale;

    return new Rectangle(
      this.scale * this.translate.x,
      this.scale * this.translate.y,
      fmt.width * ps,
      fmt.height * ps
    );
  }

  /**
   * Updates the bounds and redraws the background image.
   *
   * Example:
   *
   * If the background image should not be scaled, this can be replaced with
   * the following.
   *
   * @example
   * ```javascript
   * redrawBackground(backgroundImage, bg)
   * {
   *   backgroundImage.bounds.x = this.translate.x;
   *   backgroundImage.bounds.y = this.translate.y;
   *   backgroundImage.bounds.width = bg.width;
   *   backgroundImage.bounds.height = bg.height;
   *
   *   backgroundImage.redraw();
   * };
   * ```
   *
   * @param backgroundImage {@link mxImageShape} that represents the background image.
   * @param bg {@link mxImage} that specifies the image and its dimensions.
   */
  redrawBackgroundImage(backgroundImage: ImageShape, bg: Image): void {
    backgroundImage.scale = this.scale;
    const bounds = <Rectangle>backgroundImage.bounds;
    bounds.x = this.scale * this.translate.x;
    bounds.y = this.scale * this.translate.y;
    bounds.width = this.scale * bg.width;
    bounds.height = this.scale * bg.height;
    backgroundImage.redraw();
  }

  /**
   * Recursively creates the cell state for the given cell if visible is true and
   * the given cell is visible. If the cell is not visible but the state exists
   * then it is removed using {@link removeState}.
   *
   * @param cell {@link mxCell} whose {@link CellState} should be created.
   * @param visible Optional boolean indicating if the cell should be visible. Default
   * is true.
   */
  validateCell(cell: Cell, visible: boolean = true): Cell | null {
    visible = visible && cell.isVisible();
    const state = this.getState(cell, visible);

    if (state != null && !visible) {
      this.removeState(cell);
    } else {
      const model = (<graph>this.graph).getModel();
      const childCount = cell.getChildCount();

      for (let i = 0; i < childCount; i += 1) {
        this.validateCell(
          <Cell>cell.getChildAt(i),
          visible && (!cell.isCollapsed() || cell === this.currentRoot)
        );
      }
    }
    return cell;
  }

  /**
   * Validates and repaints the {@link CellState} for the given {@link Cell}.
   *
   * @param cell {@link mxCell} whose {@link CellState} should be validated.
   * @param recurse Optional boolean indicating if the children of the cell should be
   * validated. Default is true.
   */
  validateCellState(cell: Cell, recurse: boolean = true): CellState | null {
    let state: CellState | null = null;

    if (cell != null) {
      state = this.getState(cell);

      if (state != null) {
        const model = (<graph>this.graph).getModel();

        if (state.invalid) {
          state.invalid = false;

          if (state.style == null || state.invalidStyle) {
            state.style = (<graph>this.graph).getCellStyle(<Cell>state.cell);
            state.invalidStyle = false;
          }

          if (cell !== this.currentRoot) {
            this.validateCellState(<Cell>cell.getParent(), false);
          }

          state.setVisibleTerminalState(
            <CellState>(
              this.validateCellState(<Cell>this.getVisibleTerminal(cell, true), false)
            ),
            true
          );
          state.setVisibleTerminalState(
            <CellState>(
              this.validateCellState(<Cell>this.getVisibleTerminal(cell, false), false)
            ),
            false
          );

          this.updateCellState(state);

          // Repaint happens immediately after the cell is validated
          if (cell !== this.currentRoot && !state.invalid) {
            (<graph>this.graph).cellRenderer.redraw(state, false, this.isRendering());

            // Handles changes to invertex paintbounds after update of rendering shape
            state.updateCachedBounds();
          }
        }

        if (recurse && !state.invalid) {
          // Updates order in DOM if recursively traversing
          if (state.shape != null) {
            this.stateValidated(state);
          }

          const childCount = cell.getChildCount();
          for (let i = 0; i < childCount; i += 1) {
            this.validateCellState(<Cell>cell.getChildAt(i));
          }
        }
      }
    }
    return state;
  }

  /**
   * Updates the given {@link CellState}.
   *
   * @param state {@link mxCellState} to be updated.
   */
  updateCellState(state: CellState): void {
    const absoluteOffset = <Point>state.absoluteOffset;
    const origin = <Point>state.origin;

    absoluteOffset.x = 0;
    absoluteOffset.y = 0;
    origin.x = 0;
    origin.y = 0;
    state.length = 0;

    if (state.cell !== this.currentRoot) {
      const model = (<graph>this.graph).getModel();
      const pState = <CellState>this.getState(state.cell.getParent());

      if (pState != null && pState.cell !== this.currentRoot) {
        origin.x += (<Point>pState.origin).x;
        origin.y += (<Point>pState.origin).y;
      }

      let offset = (<graph>this.graph).getChildOffsetForCell(<Cell>state.cell);

      if (offset != null) {
        origin.x += offset.x;
        origin.y += offset.y;
      }

      const geo = (<Cell>state.cell).getGeometry();

      if (geo != null) {
        if (!state.cell.isEdge()) {
          offset = <Point>(geo.offset != null ? geo.offset : this.EMPTY_POINT);

          if (geo.relative && pState != null) {
            if (pState.cell.isEdge()) {
              const origin = this.getPoint(pState, geo);

              if (origin != null) {
                origin.x +=
                  origin.x / this.scale - (<Point>pState.origin).x - this.translate.x;
                origin.y +=
                  origin.y / this.scale - (<Point>pState.origin).y - this.translate.y;
              }
            } else {
              origin.x += geo.x * <number>pState.unscaledWidth + offset.x;
              origin.y += geo.y * <number>pState.unscaledHeight + offset.y;
            }
          } else {
            absoluteOffset.x = this.scale * offset.x;
            absoluteOffset.y = this.scale * offset.y;
            origin.x += geo.x;
            origin.y += geo.y;
          }
        }

        state.x = this.scale * (this.translate.x + origin.x);
        state.y = this.scale * (this.translate.y + origin.y);
        state.width = this.scale * geo.width;
        state.unscaledWidth = geo.width;
        state.height = this.scale * geo.height;
        state.unscaledHeight = geo.height;

        if (state.cell.isVertex()) {
          this.updateVertexState(state, geo);
        }

        if (state.cell.isEdge()) {
          this.updateEdgeState(state, geo);
        }
      }
    }

    state.updateCachedBounds();
  }

  /**
   * Validates the given cell state.
   */
  updateVertexState(state: CellState, geo: Geometry): void {
    const model = (<graph>this.graph).getModel();
    const pState = this.getState(state.cell.getParent());

    if (geo.relative && pState != null && !pState.cell.isEdge()) {
      const alpha = toRadians(pState.style.rotation || '0');

      if (alpha !== 0) {
        const cos = Math.cos(alpha);
        const sin = Math.sin(alpha);

        const ct = new Point(state.getCenterX(), state.getCenterY());
        const cx = new Point(pState.getCenterX(), pState.getCenterY());
        const pt = getRotatedPoint(ct, cos, sin, cx);
        state.x = pt.x - state.width / 2;
        state.y = pt.y - state.height / 2;
      }
    }
    this.updateVertexLabelOffset(state);
  }

  /**
   * Validates the given cell state.
   */
  updateEdgeState(state: CellState, geo: Geometry): void {
    const source = <CellState>state.getVisibleTerminalState(true);
    const target = <CellState>state.getVisibleTerminalState(false);

    // This will remove edges with no terminals and no terminal points
    // as such edges are invalid and produce NPEs in the edge styles.
    // Also removes connected edges that have no visible terminals.
    if (
      (state.cell.getTerminal(true) != null && source == null) ||
      (source == null && geo.getTerminalPoint(true) == null) ||
      (state.cell.getTerminal(false) != null && target == null) ||
      (target == null && geo.getTerminalPoint(false) == null)
    ) {
      this.clear(state.cell, true);
    } else {
      this.updateFixedTerminalPoints(state, source, target);
      this.updatePoints(state, geo.points, source, target);
      this.updateFloatingTerminalPoints(state, source, target);

      const pts = state.absolutePoints;

      if (
        state.cell !== this.currentRoot &&
        (pts == null || pts.length < 2 || pts[0] == null || pts[pts.length - 1] == null)
      ) {
        // This will remove edges with invalid points from the list of states in the view.
        // Happens if the one of the terminals and the corresponding terminal point is null.
        this.clear(state.cell, true);
      } else {
        this.updateEdgeBounds(state);
        this.updateEdgeLabelOffset(state);
      }
    }
  }

  /**
   * Updates the absoluteOffset of the given vertex cell state. This takes
   * into account the label position styles.
   *
   * @param state {@link mxCellState} whose absolute offset should be updated.
   */
  updateVertexLabelOffset(state: CellState): void {
    const h = getValue(state.style, 'labelPosition', ALIGN_CENTER);

    if (h === ALIGN_LEFT) {
      let lw = getValue(state.style, 'labelWidth', null);

      if (lw != null) {
        lw *= this.scale;
      } else {
        lw = state.width;
      }

      // @ts-ignore
      state.absoluteOffset.x -= lw;
    } else if (h === ALIGN_RIGHT) {
      // @ts-ignore
      state.absoluteOffset.x += state.width;
    } else if (h === ALIGN_CENTER) {
      const lw = getValue(state.style, 'labelWidth', null);

      if (lw != null) {
        // Aligns text block with given width inside the vertex width
        const align = getValue(state.style, 'align', ALIGN_CENTER);
        let dx = 0;

        if (align === ALIGN_CENTER) {
          dx = 0.5;
        } else if (align === ALIGN_RIGHT) {
          dx = 1;
        }

        if (dx !== 0) {
          // @ts-ignore
          state.absoluteOffset.x -= (lw * this.scale - state.width) * dx;
        }
      }
    }

    const v = getValue(state.style, 'verticalLabelPosition', ALIGN_MIDDLE);

    if (v === ALIGN_TOP) {
      // @ts-ignore
      state.absoluteOffset.y -= state.height;
    } else if (v === ALIGN_BOTTOM) {
      // @ts-ignore
      state.absoluteOffset.y += state.height;
    }
  }

  /**
   * Resets the current validation state.
   */
  resetValidationState(): void {
    this.lastNode = null;
    this.lastHtmlNode = null;
    this.lastForegroundNode = null;
    this.lastForegroundHtmlNode = null;
  }

  /**
   * Invoked when a state has been processed in {@link validatePoints}. This is used
   * to update the order of the DOM nodes of the shape.
   *
   * @param state {@link mxCellState} that represents the cell state.
   */
  stateValidated(state: CellState): void {
    const graph = <graph>this.graph;
    const fg =
      (state.cell.isEdge() && graph.keepEdgesInForeground) ||
      (state.cell.isVertex() && graph.keepEdgesInBackground);
    const htmlNode = fg
      ? this.lastForegroundHtmlNode || this.lastHtmlNode
      : this.lastHtmlNode;
    const node = fg ? this.lastForegroundNode || this.lastNode : this.lastNode;
    const result = graph.cellRenderer.insertStateAfter(state, node, htmlNode);

    if (fg) {
      this.lastForegroundHtmlNode = result[1];
      this.lastForegroundNode = result[0];
    } else {
      this.lastHtmlNode = result[1];
      this.lastNode = result[0];
    }
  }

  /**
   * Sets the initial absolute terminal points in the given state before the edge
   * style is computed.
   *
   * @param edge {@link mxCellState} whose initial terminal points should be updated.
   * @param source {@link mxCellState} which represents the source terminal.
   * @param target {@link mxCellState} which represents the target terminal.
   */
  updateFixedTerminalPoints(edge: CellState, source: CellState, target: CellState): void {
    this.updateFixedTerminalPoint(
      edge,
      source,
      true,
      (<graph>this.graph).getConnectionConstraint(edge, source, true)
    );
    this.updateFixedTerminalPoint(
      edge,
      target,
      false,
      (<graph>this.graph).getConnectionConstraint(edge, target, false)
    );
  }

  /**
   * Function: updateFixedTerminalPoint
   *
   * Sets the fixed source or target terminal point on the given edge.
   *
   * Parameters:
   *
   * edge - <mxCellState> whose terminal point should be updated.
   * terminal - <mxCellState> which represents the actual terminal.
   * source - Boolean that specifies if the terminal is the source.
   * constraint - <mxConnectionConstraint> that specifies the connection.
   */
  updateFixedTerminalPoint(
    edge: CellState,
    terminal: CellState,
    source: boolean,
    constraint: ConnectionConstraint
  ) {
    edge.setAbsoluteTerminalPoint(
      <Point>this.getFixedTerminalPoint(edge, terminal, source, constraint),
      source
    );
  }

  /**
   * Function: getFixedTerminalPoint
   *
   * Returns the fixed source or target terminal point for the given edge.
   *
   * Parameters:
   *
   * edge - <mxCellState> whose terminal point should be returned.
   * terminal - <mxCellState> which represents the actual terminal.
   * source - Boolean that specifies if the terminal is the source.
   * constraint - <mxConnectionConstraint> that specifies the connection.
   */
  getFixedTerminalPoint(
    edge: CellState,
    terminal: CellState,
    source: boolean,
    constraint: ConnectionConstraint
  ): Point | null {
    let pt = null;

    if (constraint != null) {
      pt = (<graph>this.graph).getConnectionPoint(terminal, constraint, false); // FIXME Rounding introduced bugs when calculating label positions -> , this.graph.isOrthogonal(edge));
    }

    if (pt == null && terminal == null) {
      const s = this.scale;
      const tr = this.translate;
      const orig = <Point>edge.origin;
      const geo = <Geometry>(<Cell>edge.cell).getGeometry();
      pt = geo.getTerminalPoint(source);

      if (pt != null) {
        pt = new Point(s * (tr.x + pt.x + orig.x), s * (tr.y + pt.y + orig.y));
      }
    }

    return pt;
  }

  /**
   * Updates the bounds of the given cell state to reflect the bounds of the stencil
   * if it has a fixed aspect and returns the previous bounds as an {@link Rectangle} if
   * the bounds have been modified or null otherwise.
   *
   * @param edge {@link mxCellState} whose bounds should be updated.
   */
  updateBoundsFromStencil(state: CellState): Rectangle {
    let previous = null;

    if (
      state != null &&
      state.shape != null &&
      state.shape.stencil != null &&
      state.shape.stencil.aspect === 'fixed'
    ) {
      previous = Rectangle.fromRectangle(state);
      const asp = state.shape.stencil.computeAspect(
        state.style,
        state.x,
        state.y,
        state.width,
        state.height
      );
      state.setRect(
        asp.x,
        asp.y,
        state.shape.stencil.w0 * asp.width,
        state.shape.stencil.h0 * asp.height
      );
    }
    return previous;
  }

  /**
   * Updates the absolute points in the given state using the specified array
   * of {@link mxPoints} as the relative points.
   *
   * @param edge {@link mxCellState} whose absolute points should be updated.
   * @param points Array of {@link mxPoints} that constitute the relative points.
   * @param source {@link mxCellState} that represents the source terminal.
   * @param target {@link mxCellState} that represents the target terminal.
   */
  updatePoints(
    edge: CellState,
    points: Point[],
    source: CellState,
    target: CellState
  ): void {
    if (edge != null) {
      const pts = [];
      pts.push((<Point[]>edge.absolutePoints)[0]);
      const edgeStyle = this.getEdgeStyle(edge, points, source, target);

      if (edgeStyle != null) {
        const src = <CellState>this.getTerminalPort(edge, source, true);
        const trg = <CellState>this.getTerminalPort(edge, target, false);

        // Uses the stencil bounds for routing and restores after routing
        const srcBounds = this.updateBoundsFromStencil(src);
        const trgBounds = this.updateBoundsFromStencil(trg);

        edgeStyle(edge, src, trg, points, pts);

        // Restores previous bounds
        if (srcBounds != null) {
          src.setRect(srcBounds.x, srcBounds.y, srcBounds.width, srcBounds.height);
        }

        if (trgBounds != null) {
          trg.setRect(trgBounds.x, trgBounds.y, trgBounds.width, trgBounds.height);
        }
      } else if (points != null) {
        for (let i = 0; i < points.length; i += 1) {
          if (points[i] != null) {
            const pt = clone(points[i]);
            pts.push(this.transformControlPoint(edge, pt));
          }
        }
      }

      const tmp = <Point[]>edge.absolutePoints;
      pts.push(tmp[tmp.length - 1]);

      edge.absolutePoints = pts;
    }
  }

  /**
   * Transforms the given control point to an absolute point.
   */
  transformControlPoint(
    state: CellState,
    pt: Point,
    ignoreScale: boolean = false
  ): Point | null {
    if (state != null && pt != null) {
      const orig = <Point>state.origin;
      const scale = ignoreScale ? 1 : this.scale;

      return new Point(
        scale * (pt.x + this.translate.x + orig.x),
        scale * (pt.y + this.translate.y + orig.y)
      );
    }
    return null;
  }

  /**
   * Returns true if the given edge should be routed with {@link graph.defaultLoopStyle}
   * or the {@link mxConstants.STYLE_LOOP} defined for the given edge. This implementation
   * returns true if the given edge is a loop and does not
   */
  isLoopStyleEnabled(
    edge: CellState,
    points: Point[] = [],
    source: CellState | null = null,
    target: CellState | null = null
  ): boolean {
    const sc = (<graph>this.graph).getConnectionConstraint(edge, source, true);
    const tc = (<graph>this.graph).getConnectionConstraint(edge, target, false);

    if (
      (points == null || points.length < 2) &&
      (!getValue(edge.style, 'orthogonalLoop', false) ||
        ((sc == null || sc.point == null) && (tc == null || tc.point == null)))
    ) {
      return source != null && source === target;
    }
    return false;
  }

  /**
   * Returns the edge style function to be used to render the given edge state.
   */
  getEdgeStyle(
    edge: CellState,
    points: Point[] = [],
    source: CellState | null = null,
    target: CellState | null = null
  ): any {
    let edgeStyle: any = this.isLoopStyleEnabled(edge, points, source, target)
      ? getValue(edge.style, 'loop', (<graph>this.graph).defaultLoopStyle)
      : !getValue(edge.style, 'noEdgeStyle', false)
      ? edge.style.edge
      : null;

    // Converts string values to objects
    if (typeof edgeStyle === 'string') {
      let tmp = mxStyleRegistry.getValue(edgeStyle);
      if (tmp == null && this.isAllowEval()) {
        tmp = eval(edgeStyle);
      }
      edgeStyle = tmp;
    }

    if (typeof edgeStyle === 'function') {
      return edgeStyle;
    }
    return null;
  }

  /**
   * Updates the terminal points in the given state after the edge style was
   * computed for the edge.
   *
   * @param state {@link mxCellState} whose terminal points should be updated.
   * @param source {@link mxCellState} that represents the source terminal.
   * @param target {@link mxCellState} that represents the target terminal.
   */
  updateFloatingTerminalPoints(
    state: CellState,
    source: CellState,
    target: CellState
  ): void {
    const pts = <Point[]>state.absolutePoints;
    const p0 = pts[0];
    const pe = pts[pts.length - 1];

    if (pe == null && target != null) {
      this.updateFloatingTerminalPoint(state, target, source, false);
    }

    if (p0 == null && source != null) {
      this.updateFloatingTerminalPoint(state, source, target, true);
    }
  }

  /**
   * Updates the absolute terminal point in the given state for the given
   * start and end state, where start is the source if source is true.
   *
   * @param edge {@link mxCellState} whose terminal point should be updated.
   * @param start {@link mxCellState} for the terminal on "this" side of the edge.
   * @param end {@link mxCellState} for the terminal on the other side of the edge.
   * @param source Boolean indicating if start is the source terminal state.
   */
  updateFloatingTerminalPoint(
    edge: CellState,
    start: CellState,
    end: CellState,
    source: boolean
  ): void {
    edge.setAbsoluteTerminalPoint(
      <Point>this.getFloatingTerminalPoint(edge, start, end, source),
      source
    );
  }

  /**
   * Returns the floating terminal point for the given edge, start and end
   * state, where start is the source if source is true.
   *
   * @param edge {@link mxCellState} whose terminal point should be returned.
   * @param start {@link mxCellState} for the terminal on "this" side of the edge.
   * @param end {@link mxCellState} for the terminal on the other side of the edge.
   * @param source Boolean indicating if start is the source terminal state.
   */
  getFloatingTerminalPoint(
    edge: CellState,
    start: CellState,
    end: CellState,
    source: boolean
  ): Point | null {
    start = <CellState>this.getTerminalPort(edge, start, source);
    let next = this.getNextPoint(edge, end, source);

    const orth = (<graph>this.graph).isOrthogonal(edge);
    const alpha = toRadians(Number(start.style.rotation || '0'));
    const center = new Point(start.getCenterX(), start.getCenterY());

    if (alpha !== 0) {
      const cos = Math.cos(-alpha);
      const sin = Math.sin(-alpha);
      next = getRotatedPoint(next, cos, sin, center);
    }

    let border = parseFloat(edge.style.perimeterSpacing || 0);
    border += parseFloat(
      edge.style[source ? 'sourcePerimeterSpacing' : 'targetPerimeterSpacing'] || 0
    );
    let pt = this.getPerimeterPoint(start, <Point>next, alpha === 0 && orth, border);

    if (alpha !== 0) {
      const cos = Math.cos(alpha);
      const sin = Math.sin(alpha);
      pt = getRotatedPoint(pt, cos, sin, center);
    }

    return pt;
  }

  /**
   * Returns an {@link CellState} that represents the source or target terminal or
   * port for the given edge.
   *
   * @param state {@link mxCellState} that represents the state of the edge.
   * @param terminal {@link mxCellState} that represents the terminal.
   * @param source Boolean indicating if the given terminal is the source terminal.
   */
  getTerminalPort(
    state: CellState,
    terminal: CellState,
    source: boolean = false
  ): CellState | null {
    const key = source ? 'sourcePort' : 'targetPort';
    const id = getValue(state.style, key);

    if (id != null) {
      const tmp = this.getState((<graph>this.graph).getModel().getCell(id), false);

      // Only uses ports where a cell state exists
      if (tmp != null) {
        terminal = tmp;
      }
    }
    return terminal;
  }

  /**
   * Returns an {@link Point} that defines the location of the intersection point between
   * the perimeter and the line between the center of the shape and the given point.
   *
   * @param terminal {@link mxCellState} for the source or target terminal.
   * @param next {@link mxPoint} that lies outside of the given terminal.
   * @param orthogonal Boolean that specifies if the orthogonal projection onto
   * the perimeter should be returned. If this is false then the intersection
   * of the perimeter and the line between the next and the center point is
   * returned.
   * @param border Optional border between the perimeter and the shape.
   */
  getPerimeterPoint(
    terminal: CellState,
    next: Point,
    orthogonal: boolean,
    border: number = 0
  ): Point {
    let point = null;

    if (terminal != null) {
      const perimeter = this.getPerimeterFunction(terminal);

      if (perimeter != null && next != null) {
        const bounds = <Rectangle>this.getPerimeterBounds(terminal, border);

        if (bounds.width > 0 || bounds.height > 0) {
          point = new point(next.x, next.y);
          let flipH = false;
          let flipV = false;

          if (terminal.cell.isVertex()) {
            flipH = getValue(terminal.style, 'flipH', 0) == 1;
            flipV = getValue(terminal.style, 'flipV', 0) == 1;

            // Legacy support for stencilFlipH/V
            if (terminal.shape != null && terminal.shape.stencil != null) {
              flipH = getValue(terminal.style, 'stencilFlipH', 0) == 1 || flipH;
              flipV = getValue(terminal.style, 'stencilFlipV', 0) == 1 || flipV;
            }

            if (flipH) {
              point.x = 2 * bounds.getCenterX() - point.x;
            }

            if (flipV) {
              point.y = 2 * bounds.getCenterY() - point.y;
            }
          }

          point = perimeter(bounds, terminal, point, orthogonal);

          if (point != null) {
            if (flipH) {
              point.x = 2 * bounds.getCenterX() - point.x;
            }

            if (flipV) {
              point.y = 2 * bounds.getCenterY() - point.y;
            }
          }
        }
      }

      if (point == null) {
        point = this.getPoint(terminal);
      }
    }
    return point;
  }

  /**
   * Returns the x-coordinate of the center point for automatic routing.
   */
  getRoutingCenterX(state: CellState): number {
    const f = state.style != null ? parseFloat(state.style.routingCenterX) || 0 : 0;
    return state.getCenterX() + f * state.width;
  }

  /**
   * Returns the y-coordinate of the center point for automatic routing.
   */
  getRoutingCenterY(state: CellState): number {
    const f = state.style != null ? parseFloat(state.style.routingCenterY) || 0 : 0;
    return state.getCenterY() + f * state.height;
  }

  /**
   * Returns the perimeter bounds for the given terminal, edge pair as an
   * {@link Rectangle}.
   *
   * If you have a model where each terminal has a relative child that should
   * act as the graphical endpoint for a connection from/to the terminal, then
   * this method can be replaced as follows:
   *
   * @example
   * ```javascript
   * var oldGetPerimeterBounds = getPerimeterBounds;
   * getPerimeterBounds(terminal, edge, isSource)
   * {
   *   var model = this.graph.getModel();
   *   var childCount = model.getChildCount(terminal.cell);
   *
   *   if (childCount > 0)
   *   {
   *     var child = model.getChildAt(terminal.cell, 0);
   *     var geo = model.getGeometry(child);
   *
   *     if (geo != null &&
   *         geo.relative)
   *     {
   *       var state = this.getState(child);
   *
   *       if (state != null)
   *       {
   *         terminal = state;
   *       }
   *     }
   *   }
   *
   *   return oldGetPerimeterBounds.apply(this, arguments);
   * };
   * ```
   *
   * @param {CellState} terminal mxCellState that represents the terminal.
   * @param {number} border Number that adds a border between the shape and the perimeter.
   */
  getPerimeterBounds(
    terminal: CellState | null = null,
    border: number = 0
  ): Rectangle | null {
    if (terminal != null) {
      border += parseFloat(terminal.style.perimeterSpacing || 0);
    }
    return (<CellState>terminal).getPerimeterBounds(border * this.scale);
  }

  /**
   * Returns the perimeter function for the given state.
   */
  getPerimeterFunction(state: CellState): Function | null {
    let perimeter = state.style.perimeter;

    // Converts string values to objects
    if (typeof perimeter === 'string') {
      let tmp = mxStyleRegistry.getValue(perimeter);
      if (tmp == null && this.isAllowEval()) {
        tmp = eval(perimeter);
      }
      perimeter = tmp;
    }

    if (typeof perimeter === 'function') {
      return perimeter;
    }
    return null;
  }

  /**
   * Returns the nearest point in the list of absolute points or the center
   * of the opposite terminal.
   *
   * @param edge {@link mxCellState} that represents the edge.
   * @param opposite {@link mxCellState} that represents the opposite terminal.
   * @param source Boolean indicating if the next point for the source or target
   * should be returned.
   */
  getNextPoint(
    edge: CellState,
    opposite: CellState | null,
    source: boolean = false
  ): Point | null {
    const pts = edge.absolutePoints;
    let point = null;

    if (pts != null && pts.length >= 2) {
      const count = pts.length;
      point = pts[source ? Math.min(1, count - 1) : Math.max(0, count - 2)];
    }

    if (point == null && opposite != null) {
      point = new point(opposite.getCenterX(), opposite.getCenterY());
    }

    return point;
  }

  /**
   * Returns the nearest ancestor terminal that is visible. The edge appears
   * to be connected to this terminal on the display. The result of this method
   * is cached in {@link CellState.getVisibleTerminalState}.
   *
   * @param edge {@link mxCell} whose visible terminal should be returned.
   * @param source Boolean that specifies if the source or target terminal
   * should be returned.
   */
  getVisibleTerminal(edge: Cell, source: boolean): Cell | null {
    const model = (<graph>this.graph).getModel();
    let result = edge.getTerminal(source);
    let best = result;

    while (result != null && result != this.currentRoot) {
      if ((best && !best.isVisible()) || result.isCollapsed()) {
        best = result;
      }

      result = result.getParent();
    }

    // Checks if the result is valid for the current view state
    if (
      best != null &&
      (!model.contains(best) ||
        best.getParent() === model.getRoot() ||
        best === this.currentRoot)
    ) {
      best = null;
    }

    return best;
  }

  /**
   * Updates the given state using the bounding box of t
   * he absolute points.
   * Also updates {@link CellState.terminalDistance}, {@link CellState.length} and
   * {@link CellState.segments}.
   *
   * @param state {@link mxCellState} whose bounds should be updated.
   */
  updateEdgeBounds(state: CellState): void {
    const points = <Point[]>state.absolutePoints;
    const p0 = points[0];
    const pe = points[points.length - 1];

    if (p0.x !== pe.x || p0.y !== pe.y) {
      const dx = pe.x - p0.x;
      const dy = pe.y - p0.y;
      state.terminalDistance = Math.sqrt(dx * dx + dy * dy);
    } else {
      state.terminalDistance = 0;
    }

    let length = 0;
    const segments = [];
    let pt = p0;

    if (pt != null) {
      let minX = pt.x;
      let minY = pt.y;
      let maxX = minX;
      let maxY = minY;

      for (let i = 1; i < points.length; i += 1) {
        const tmp = points[i];

        if (tmp != null) {
          const dx = pt.x - tmp.x;
          const dy = pt.y - tmp.y;

          const segment = Math.sqrt(dx * dx + dy * dy);
          segments.push(segment);
          length += segment;

          pt = tmp;

          minX = Math.min(pt.x, minX);
          minY = Math.min(pt.y, minY);
          maxX = Math.max(pt.x, maxX);
          maxY = Math.max(pt.y, maxY);
        }
      }

      state.length = length;
      state.segments = segments;

      const markerSize = 1; // TODO: include marker size

      state.x = minX;
      state.y = minY;
      state.width = Math.max(markerSize, maxX - minX);
      state.height = Math.max(markerSize, maxY - minY);
    }
  }

  /**
   * Returns the absolute point on the edge for the given relative
   * {@link Geometry} as an {@link Point}. The edge is represented by the given
   * {@link CellState}.
   *
   * @param state {@link mxCellState} that represents the state of the parent edge.
   * @param geometry {@link mxGeometry} that represents the relative location.
   */
  getPoint(state: CellState, geometry: Geometry | null = null): Point {
    let x = state.getCenterX();
    let y = state.getCenterY();

    if (state.segments != null && (geometry == null || geometry.relative)) {
      const gx = geometry != null ? geometry.x / 2 : 0;
      const pointCount = (<Point[]>state.absolutePoints).length;
      const dist = Math.round((gx + 0.5) * state.length);
      let segment = state.segments[0];
      let length = 0;
      let index = 1;

      while (dist >= Math.round(length + segment) && index < pointCount - 1) {
        length += segment;
        segment = state.segments[index++];
      }

      const factor = segment === 0 ? 0 : (dist - length) / segment;
      const p0 = (<Point[]>state.absolutePoints)[index - 1];
      const pe = (<Point[]>state.absolutePoints)[index];

      if (p0 != null && pe != null) {
        let gy = 0;
        let offsetX = 0;
        let offsetY = 0;

        if (geometry != null) {
          gy = geometry.y;
          const { offset } = geometry;

          if (offset != null) {
            offsetX = offset.x;
            offsetY = offset.y;
          }
        }

        const dx = pe.x - p0.x;
        const dy = pe.y - p0.y;
        const nx = segment === 0 ? 0 : dy / segment;
        const ny = segment === 0 ? 0 : dx / segment;

        x = p0.x + dx * factor + (nx * gy + offsetX) * this.scale;
        y = p0.y + dy * factor - (ny * gy - offsetY) * this.scale;
      }
    } else if (geometry != null) {
      const { offset } = geometry;

      if (offset != null) {
        x += offset.x;
        y += offset.y;
      }
    }

    return new Point(x, y);
  }

  /**
   * Gets the relative point that describes the given, absolute label
   * position for the given edge state.
   *
   * @param state {@link mxCellState} that represents the state of the parent edge.
   * @param x Specifies the x-coordinate of the absolute label location.
   * @param y Specifies the y-coordinate of the absolute label location.
   */
  getRelativePoint(edgeState: CellState, x: number, y: number): Point {
    const model = (<graph>this.graph).getModel();
    const geometry = edgeState.cell.getGeometry();

    if (geometry != null) {
      const absolutePoints = <Point[]>edgeState.absolutePoints;
      const pointCount = absolutePoints.length;

      if (geometry.relative && pointCount > 1) {
        const totalLength = edgeState.length;
        let { segments } = edgeState;
        segments = <number[]>segments;

        // Works out which line segment the point of the label is closest to
        let p0 = absolutePoints[0];
        let pe = absolutePoints[1];
        let minDist = ptSegDistSq(p0.x, p0.y, pe.x, pe.y, x, y);
        let length = 0;
        let index = 0;
        let tmp = 0;

        for (let i = 2; i < pointCount; i += 1) {
          p0 = pe;
          pe = absolutePoints[i];
          const dist = ptSegDistSq(p0.x, p0.y, pe.x, pe.y, x, y);
          tmp += segments[i - 2];

          if (dist <= minDist) {
            minDist = dist;
            index = i - 1;
            length = tmp;
          }
        }

        const seg = segments[index];
        p0 = absolutePoints[index];
        pe = absolutePoints[index + 1];

        const x2 = p0.x;
        const y2 = p0.y;

        const x1 = pe.x;
        const y1 = pe.y;

        let px = x;
        let py = y;

        const xSegment = x2 - x1;
        const ySegment = y2 - y1;

        px -= x1;
        py -= y1;
        let projlenSq = 0;

        px = xSegment - px;
        py = ySegment - py;
        const dotprod = px * xSegment + py * ySegment;

        if (dotprod <= 0.0) {
          projlenSq = 0;
        } else {
          projlenSq = (dotprod * dotprod) / (xSegment * xSegment + ySegment * ySegment);
        }

        let projlen = Math.sqrt(projlenSq);

        if (projlen > seg) {
          projlen = seg;
        }

        let yDistance = Math.sqrt(ptSegDistSq(p0.x, p0.y, pe.x, pe.y, x, y));
        const direction = relativeCcw(p0.x, p0.y, pe.x, pe.y, x, y);

        if (direction === -1) {
          yDistance = -yDistance;
        }

        // Constructs the relative point for the label
        return new Point(
          ((totalLength / 2 - length - projlen) / totalLength) * -2,
          yDistance / this.scale
        );
      }
    }
    return new Point();
  }

  /**
   * Updates {@link CellState.absoluteOffset} for the given state. The absolute
   * offset is normally used for the position of the edge label. Is is
   * calculated from the geometry as an absolute offset from the center
   * between the two endpoints if the geometry is absolute, or as the
   * relative distance between the center along the line and the absolute
   * orthogonal distance if the geometry is relative.
   *
   * @param state {@link mxCellState} whose absolute offset should be updated.
   */
  updateEdgeLabelOffset(state: CellState): void {
    const points = state.absolutePoints;
    const absoluteOffset = <Point>state.absoluteOffset;
    absoluteOffset.x = state.getCenterX();
    absoluteOffset.y = state.getCenterY();

    if (points != null && points.length > 0 && state.segments != null) {
      const geometry = <Geometry>(<Cell>state.cell).getGeometry();

      if (geometry.relative) {
        const offset = this.getPoint(state, geometry);

        if (offset != null) {
          state.absoluteOffset = offset;
        }
      } else {
        const p0 = points[0];
        const pe = points[points.length - 1];

        if (p0 != null && pe != null) {
          const dx = pe.x - p0.x;
          const dy = pe.y - p0.y;
          let x0 = 0;
          let y0 = 0;

          const off = geometry.offset;

          if (off != null) {
            x0 = off.x;
            y0 = off.y;
          }

          const x = p0.x + dx / 2 + x0 * this.scale;
          const y = p0.y + dy / 2 + y0 * this.scale;

          absoluteOffset.x = x;
          absoluteOffset.y = y;
        }
      }
    }
  }

  /**
   * Returns the {@link CellState} for the given cell. If create is true, then
   * the state is created if it does not yet exist.
   *
   * @param cell {@link mxCell} for which the {@link CellState} should be returned.
   * @param create Optional boolean indicating if a new state should be created
   * if it does not yet exist. Default is false.
   */
  getState(cell: Cell | null = null, create: boolean = false): CellState {
    let state: CellState | null = null;

    if (cell != null) {
      state = this.states.get(cell);

      if (create && (state == null || this.updateStyle) && cell.isVisible()) {
        if (state == null) {
          state = this.createState(cell);
          this.states.put(cell, state);
        } else {
          state.style = (<graph>this.graph).getCellStyle(cell);
        }
      }
    }
    return state;
  }

  /**
   * Returns the {@link mxCellStates} for the given array of {@link Cell}. The array
   * contains all states that are not null, that is, the returned array may
   * have less elements than the given array. If no argument is given, then
   * this returns {@link states}.
   */
  getCellStates(cells: CellArray | null): CellState[] | Dictionary | null {
    if (cells == null) {
      return this.states;
    }

    const result: CellState[] = [];
    for (const cell of cells) {
      const state = this.getState(cell);
      if (state != null) {
        result.push(state);
      }
    }
    return result;
  }

  /**
   * Removes and returns the {@link CellState} for the given cell.
   *
   * @param cell {@link mxCell} for which the {@link CellState} should be removed.
   */
  removeState(cell: Cell): CellState | null {
    let state: CellState | null = null;

    if (cell != null) {
      state = this.states.remove(cell);

      if (state != null) {
        (<graph>this.graph).cellRenderer.destroy(state);
        state.invalid = true;
        state.destroy();
      }
    }
    return state;
  }

  /**
   * Creates and returns an {@link CellState} for the given cell and initializes
   * it using {@link cellRenderer.initialize}.
   *
   * @param cell {@link mxCell} for which a new {@link CellState} should be created.
   */
  createState(cell: Cell): CellState {
    return new CellState(this, cell, (<graph>this.graph).getCellStyle(cell));
  }

  /**
   * Returns true if the event origin is one of the drawing panes or
   * containers of the view.
   */
  isContainerEvent(evt: Event | MouseEvent): boolean {
    const source = getSource(evt);

    return (
      source === (<graph>this.graph).container ||
      source.parentNode === this.backgroundPane ||
      (source.parentNode != null &&
        source.parentNode.parentNode === this.backgroundPane) ||
      // @ts-ignore
      source === this.canvas.parentNode ||
      source === this.canvas ||
      source === this.backgroundPane ||
      source === this.drawPane ||
      source === this.overlayPane ||
      source === this.decoratorPane
    );
  }

  /**
   * Returns true if the event origin is one of the scrollbars of the
   * container in IE. Such events are ignored.
   */
  isScrollEvent(evt: MouseEvent): boolean {
    const graph = <graph>this.graph;
    const offset = getOffset(graph.container);
    const pt = new Point(evt.clientX - offset.x, evt.clientY - offset.y);
    const container = <HTMLElement>graph.container;

    const outWidth = container.offsetWidth;
    const inWidth = container.clientWidth;

    if (outWidth > inWidth && pt.x > inWidth + 2 && pt.x <= outWidth) {
      return true;
    }

    const outHeight = container.offsetHeight;
    const inHeight = container.clientHeight;

    return outHeight > inHeight && pt.y > inHeight + 2 && pt.y <= outHeight;
  }

  /**
   * Initializes the graph event dispatch loop for the specified container
   * and invokes {@link create} to create the required DOM nodes for the display.
   */
  init(): void {
    this.installListeners();

    // Creates the DOM nodes for the respective display dialect
    const { graph } = this;
    this.createSvg();
  }

  /**
   * Installs the required listeners in the container.
   */
  installListeners(): void {
    const graph = <graph>this.graph;
    const { container } = graph;

    if (container != null) {
      // Support for touch device gestures (eg. pinch to zoom)
      // Double-tap handling is implemented in mxGraph.fireMouseEvent
      if (mxClient.IS_TOUCH) {
        InternalEvent.addListener(container, 'gesturestart', ((evt: MouseEvent) => {
          graph.fireGestureEvent(evt);
          InternalEvent.consume(evt);
        }) as EventListener);

        InternalEvent.addListener(container, 'gesturechange', ((evt: MouseEvent) => {
          graph.fireGestureEvent(evt);
          InternalEvent.consume(evt);
        }) as EventListener);

        InternalEvent.addListener(container, 'gestureend', ((evt: MouseEvent) => {
          graph.fireGestureEvent(evt);
          InternalEvent.consume(evt);
        }) as EventListener);
      }

      // Fires event only for one pointer per gesture
      let pointerId: number | null = null;

      // Adds basic listeners for graph event dispatching
      InternalEvent.addGestureListeners(
        container,
        ((evt: MouseEvent) => {
          // Condition to avoid scrollbar events starting a rubberband selection
          if (
            this.isContainerEvent(evt) &&
            ((!mxClient.IS_GC && !mxClient.IS_SF) || !this.isScrollEvent(evt))
          ) {
            graph.fireMouseEvent(InternalEvent.MOUSE_DOWN, new InternalMouseEvent(evt));
            // @ts-ignore
            pointerId = evt.pointerId;
          }
        }) as EventListener,
        (evt: Event) => {
          if (
            this.isContainerEvent(evt) &&
            // @ts-ignore
            (pointerId == null || evt.pointerId === pointerId)
          ) {
            graph.fireMouseEvent(InternalEvent.MOUSE_MOVE, new InternalMouseEvent(evt));
          }
        },
        (evt: Event) => {
          if (this.isContainerEvent(evt)) {
            graph.fireMouseEvent(InternalEvent.MOUSE_UP, new InternalMouseEvent(evt));
          }

          pointerId = null;
        }
      );

      // Adds listener for double click handling on background, this does always
      // use native event handler, we assume that the DOM of the background
      // does not change during the double click
      InternalEvent.addListener(container, 'dblclick', ((evt: MouseEvent) => {
        if (this.isContainerEvent(evt)) {
          graph.dblClick(evt);
        }
      }) as EventListener);

      // Workaround for touch events which started on some DOM node
      // on top of the container, in which case the cells under the
      // mouse for the move and up events are not detected.
      const getState = (evt: Event) => {
        let state = null;

        // Workaround for touch events which started on some DOM node
        // on top of the container, in which case the cells under the
        // mouse for the move and up events are not detected.
        if (mxClient.IS_TOUCH) {
          const x = getClientX(evt);
          const y = getClientY(evt);

          // Dispatches the drop event to the graph which
          // consumes and executes the source function
          const pt = convertPoint(container, x, y);
          state = (<GraphView>graph.view).getState(graph.getCellAt(pt.x, pt.y));
        }

        return state;
      };

      // Adds basic listeners for graph event dispatching outside of the
      // container and finishing the handling of a single gesture
      // Implemented via graph event dispatch loop to avoid duplicate events
      // in Firefox and Chrome
      graph.addMouseListener({
        mouseDown: (sender: any, me: InternalMouseEvent) => {
          (<PopupMenuHandler>graph.popupMenuHandler).hideMenu();
        },
        mouseMove: () => {},
        mouseUp: () => {},
      });

      this.moveHandler = (evt: Event) => {
        // Hides the tooltip if mouse is outside container
        if (graph.tooltipHandler != null && graph.tooltipHandler.isHideOnHover()) {
          graph.tooltipHandler.hide();
        }

        if (
          this.captureDocumentGesture &&
          graph.isMouseDown &&
          graph.container != null &&
          !this.isContainerEvent(evt) &&
          graph.container.style.display !== 'none' &&
          graph.container.style.visibility !== 'hidden' &&
          !isConsumed(evt)
        ) {
          graph.fireMouseEvent(
            InternalEvent.MOUSE_MOVE,
            new InternalMouseEvent(evt, getState(evt))
          );
        }
      };

      this.endHandler = (evt: Event) => {
        if (
          this.captureDocumentGesture &&
          graph.isMouseDown &&
          graph.container != null &&
          !this.isContainerEvent(evt) &&
          graph.container.style.display !== 'none' &&
          graph.container.style.visibility !== 'hidden'
        ) {
          graph.fireMouseEvent(InternalEvent.MOUSE_UP, new InternalMouseEvent(evt));
        }
      };

      InternalEvent.addGestureListeners(
        document,
        null,
        this.moveHandler,
        this.endHandler
      );
    }
  }

  /**
   * Creates and returns the DOM nodes for the SVG display.
   */
  createSvg(): void {
    const { container } = <graph>this.graph;
    const canvas = (this.canvas = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'g'
    ));

    // For background image
    this.backgroundPane = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    canvas.appendChild(this.backgroundPane);

    // Adds two layers (background is early feature)
    this.drawPane = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    canvas.appendChild(this.drawPane);

    this.overlayPane = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    canvas.appendChild(this.overlayPane);

    this.decoratorPane = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    canvas.appendChild(this.decoratorPane);

    const root = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    root.style.left = '0px';
    root.style.top = '0px';
    root.style.width = '100%';
    root.style.height = '100%';

    // NOTE: In standards mode, the SVG must have block layout
    // in order for the container DIV to not show scrollbars.
    root.style.display = 'block';
    root.appendChild(this.canvas);

    if (container != null) {
      container.appendChild(root);
      this.updateContainerStyle(container);
    }
  }

  /**
   * Updates the style of the container after installing the SVG DOM elements.
   */
  updateContainerStyle(container: HTMLElement) {
    // Workaround for offset of container
    const style = getCurrentStyle(container);

    if (style != null && style.position == 'static') {
      container.style.position = 'relative';
    }

    // Disables built-in pan and zoom in IE10 and later
    if (mxClient.IS_POINTER) {
      container.style.touchAction = 'none';
    }
  }

  /**
   * Destroys the view and all its resources.
   */
  destroy(): void {
    let root: SVGElement | null =
      this.canvas != null ? this.canvas.ownerSVGElement : null;

    if (root == null) {
      root = this.canvas;
    }

    if (root != null && root.parentNode != null) {
      this.clear(<Cell>this.currentRoot, true);
      InternalEvent.removeGestureListeners(
        document,
        null,
        this.moveHandler,
        this.endHandler
      );
      InternalEvent.release(this.graph.container);
      root.parentNode.removeChild(root);

      this.moveHandler = null;
      this.endHandler = null;
      this.canvas = null;
      this.backgroundPane = null;
      this.drawPane = null;
      this.overlayPane = null;
      this.decoratorPane = null;
    }
  }

  endHandler: EventListener | null = null;
  moveHandler: EventListener | null = null;
}

export default GraphView;
// import('../../serialization/mxGraphViewCodec');
