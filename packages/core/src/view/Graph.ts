/**
 * Copyright (c) 2006-2015, JGraph Ltd
 * Copyright (c) 2006-2015, Gaudenz Alder
 * Updated to ES9 syntax by David Morrissey 2021
 * Type definitions from the typed-mxgraph project
 */

import Image from './image/ImageBox';
import EventObject from './event/EventObject';
import EventSource from './event/EventSource';
import InternalEvent from './event/InternalEvent';
import Rectangle from './geometry/Rectangle';
import TooltipHandler from './tooltip/TooltipHandler';
import mxClient from '../mxClient';
import SelectionCellsHandler from './selection/SelectionCellsHandler';
import ConnectionHandler from './connection/ConnectionHandler';
import GraphHandler from './GraphHandler';
import PanningHandler from './panning/PanningHandler';
import PopupMenuHandler from './popups_menus/PopupMenuHandler';
import mxGraphSelectionModel from './selection/mxGraphSelectionModel';
import GraphView from './view/GraphView';
import CellRenderer from './cell/CellRenderer';
import CellEditor from './editing/CellEditor';
import Point from './geometry/Point';
import {
  getBoundingBox,
  getCurrentStyle,
  getValue,
  hasScrollbars,
  parseCssNumber,
} from '../util/Utils';
import Cell from './cell/datatypes/Cell';
import Model from './model/Model';
import Stylesheet from './style/Stylesheet';
import { DIALECT_SVG, PAGE_FORMAT_A4_PORTRAIT } from '../util/Constants';

import ChildChange from './model/ChildChange';
import GeometryChange from './geometry/GeometryChange';
import RootChange from './model/RootChange';
import StyleChange from './style/StyleChange';
import TerminalChange from './cell/edge/TerminalChange';
import ValueChange from './cell/ValueChange';
import CellState from './cell/datatypes/CellState';
import { isNode } from '../util/DomUtils';
import CellArray from './cell/datatypes/CellArray';
import EdgeStyle from './style/EdgeStyle';
import EdgeHandler from './cell/edge/EdgeHandler';
import VertexHandler from './cell/vertex/VertexHandler';
import EdgeSegmentHandler from './cell/edge/EdgeSegmentHandler';
import ElbowEdgeHandler from './cell/edge/ElbowEdgeHandler';

/**
 * Extends {@link EventSource} to implement a graph component for
 * the browser. This is the main class of the package. To activate
 * panning and connections use {@link setPanning} and {@link setConnectable}.
 * For rubberband selection you must create a new instance of
 * {@link rubberband}. The following listeners are added to
 * {@link mouseListeners} by default:
 *
 * - tooltipHandler: {@link TooltipHandler} that displays tooltips
 * - panningHandler: {@link PanningHandler} for panning and popup menus
 * - connectionHandler: {@link ConnectionHandler} for creating connections
 * - graphHandler: {@link GraphHandler} for moving and cloning cells
 *
 * These listeners will be called in the above order if they are enabled.
 * @class graph
 * @extends {EventSource}
 */
class Graph extends EventSource {
  constructor(
    container: HTMLElement,
    model: Model,
    renderHint: string = DIALECT_SVG,
    stylesheet: Stylesheet | null = null
  ) {
    super();

    // Converts the renderHint into a dialect
    this.renderHint = renderHint;
    this.dialect = 'svg';

    // Initializes the main members that do not require a container
    this.model = model != null ? model : new Model();
    this.cellRenderer = this.createCellRenderer();
    this.setSelectionModel(this.createSelectionModel());
    this.setStylesheet(stylesheet != null ? stylesheet : this.createStylesheet());
    this.view = this.createGraphView();

    // Adds a graph model listener to update the view
    this.graphModelChangeListener = (sender: any, evt: EventObject) => {
      this.graphModelChanged(evt.getProperty('edit').changes);
    };

    this.getModel().addListener(InternalEvent.CHANGE, this.graphModelChangeListener);

    // Installs basic event handlers with disabled default settings.
    this.createHandlers();

    // Initializes the display if a container was specified
    if (container != null) {
      this.init(container);
    }

    this.view.revalidate();
  }

  /**
   * Initializes the {@link container} and creates the respective datastructures.
   *
   * @param container DOM node that will contain the graph display.
   */
  init(container: HTMLElement): void {
    this.container = container;

    // Initializes the in-place editor
    this.cellEditor = this.createCellEditor();

    // Initializes the container using the view
    this.view.init();

    // Updates the size of the container for the current graph
    this.sizeDidChange();

    // Hides tooltips and resets tooltip timer if mouse leaves container
    InternalEvent.addListener(container, 'mouseleave', (evt: Event) => {
      if (
        this.tooltipHandler != null &&
        this.tooltipHandler.div != null &&
        this.tooltipHandler.div != (<MouseEvent>evt).relatedTarget
      ) {
        this.tooltipHandler.hide();
      }
    });
  }

  // TODO: Document me!

  // @ts-ignore
  container: HTMLElement;
  destroyed: boolean = false;
  tooltipHandler: TooltipHandler | null = null;
  selectionCellsHandler: SelectionCellsHandler | null = null;
  popupMenuHandler: PopupMenuHandler | null = null;
  connectionHandler: ConnectionHandler | null = null;
  graphHandler: GraphHandler | null = null;
  graphModelChangeListener: Function | null = null;
  paintBackground: Function | null = null;

  /*****************************************************************************
   * Group: Variables
   *****************************************************************************/

  /**
   * Holds the {@link Model} that contains the cells to be displayed.
   */
  model: Model;

  /**
   * Holds the {@link GraphView} that caches the {@link CellState}s for the cells.
   */
  view: GraphView;

  /**
   * Holds the {@link Stylesheet} that defines the appearance of the cells.
   *
   * Use the following code to read a stylesheet into an existing graph.
   *
   * @example
   * ```javascript
   * var req = mxUtils.load('stylesheet.xml');
   * var root = req.getDocumentElement();
   * var dec = new mxCodec(root.ownerDocument);
   * dec.decode(root, graph.stylesheet);
   * ```
   */
  // @ts-ignore
  stylesheet: Stylesheet;

  /**
   * Holds the {@link mxGraphSelectionModel} that models the current selection.
   */
  selectionModel: mxGraphSelectionModel | null = null;

  /**
   * Holds the {@link CellEditor} that is used as the in-place editing.
   */
  // @ts-ignore
  cellEditor: CellEditor;

  /**
   * Holds the {@link CellRenderer} for rendering the cells in the graph.
   */
  cellRenderer: CellRenderer;

  /**
   * RenderHint as it was passed to the constructor.
   */
  renderHint: string | null = null;

  /**
   * Dialect to be used for drawing the graph. Possible values are all
   * constants in {@link mxConstants} with a DIALECT-prefix.
   */
  dialect: 'svg' | 'mixedHtml' | 'preferHtml' | 'strictHtml' = 'svg';

  /**
   * Value returned by {@link getOverlap} if {@link isAllowOverlapParent} returns
   * `true` for the given cell. {@link getOverlap} is used in {@link constrainChild} if
   * {@link isConstrainChild} returns `true`. The value specifies the
   * portion of the child which is allowed to overlap the parent.
   */
  defaultOverlap: number = 0.5;

  /**
   * Specifies the default parent to be used to insert new cells.
   * This is used in {@link getDefaultParent}.
   * @default null
   */
  defaultParent: Cell | null = null;

  /**
   * Specifies the {@link Image} to be returned by {@link getBackgroundImage}.
   * @default null
   *
   * @example
   * ```javascript
   * var img = new mxImage('http://www.example.com/maps/examplemap.jpg', 1024, 768);
   * graph.setBackgroundImage(img);
   * graph.view.validate();
   * ```
   */
  backgroundImage: Image | null = null;

  /**
   * Specifies if the background page should be visible.
   * Not yet implemented.
   * @default false
   */
  pageVisible: boolean = false;

  /**
   * Specifies if a dashed line should be drawn between multiple pages.
   * If you change this value while a graph is being displayed then you
   * should call {@link sizeDidChange} to force an update of the display.
   * @default false
   */
  pageBreaksVisible: boolean = false;

  /**
   * Specifies the color for page breaks.
   * @default gray
   */
  pageBreakColor: string = 'gray';

  /**
   * Specifies the page breaks should be dashed.
   * @default true
   */
  pageBreakDashed: boolean = true;

  /**
   * Specifies the minimum distance in pixels for page breaks to be visible.
   * @default 20
   */
  minPageBreakDist: number = 20;

  /**
   * Specifies if the graph size should be rounded to the next page number in
   * {@link sizeDidChange}. This is only used if the graph container has scrollbars.
   * @default false
   */
  preferPageSize: boolean = false;

  /**
   * Specifies the page format for the background page.
   * This is used as the default in {@link printPreview} and for painting the background page
   * if {@link pageVisible} is `true` and the page breaks if {@link pageBreaksVisible} is `true`.
   * @default {@link mxConstants.PAGE_FORMAT_A4_PORTRAIT}
   */
  pageFormat: Rectangle = new Rectangle(...PAGE_FORMAT_A4_PORTRAIT);

  /**
   * Specifies the scale of the background page.
   * Not yet implemented.
   * @default 1.5
   */
  pageScale: number = 1.5;

  /**
   * Specifies the return value for {@link isEnabled}.
   * @default true
   */
  enabled: boolean = true;

  /**
   * Specifies the return value for {@link canExportCell}.
   * @default true
   */
  exportEnabled: boolean = true;

  /**
   * Specifies the return value for {@link canImportCell}.
   * @default true
   */
  importEnabled: boolean = true;

  /**
   * Specifies if the graph should automatically scroll regardless of the
   * scrollbars. This will scroll the container using positive values for
   * scroll positions (ie usually only rightwards and downwards). To avoid
   * possible conflicts with panning, set {@link translateToScrollPosition} to `true`.
   */
  ignoreScrollbars: boolean = false;

  /**
   * Specifies if the graph should automatically convert the current scroll
   * position to a translate in the graph view when a mouseUp event is received.
   * This can be used to avoid conflicts when using {@link autoScroll} and
   * {@link ignoreScrollbars} with no scrollbars in the container.
   */
  translateToScrollPosition: boolean = false;

  /**
   * {@link Rectangle} that specifies the area in which all cells in the diagram
   * should be placed. Uses in {@link getMaximumGraphBounds}. Use a width or height of
   * `0` if you only want to give a upper, left corner.
   */
  maximumGraphBounds: Rectangle | null = null;

  /**
   * {@link Rectangle} that specifies the minimum size of the graph. This is ignored
   * if the graph container has no scrollbars.
   * @default null
   */
  minimumGraphSize: Rectangle | null = null;

  /**
   * {@link Rectangle} that specifies the minimum size of the {@link container} if
   * {@link resizeContainer} is `true`.
   */
  minimumContainerSize: Rectangle | null = null;

  /**
   * {@link Rectangle} that specifies the maximum size of the container if
   * {@link resizeContainer} is `true`.
   */
  maximumContainerSize: Rectangle | null = null;

  /**
   * Specifies if the container should be resized to the graph size when
   * the graph size has changed.
   * @default false
   */
  resizeContainer: boolean = false;

  /**
   * Border to be added to the bottom and right side when the container is
   * being resized after the graph has been changed.
   * @default 0
   */
  border: number = 0;

  /**
   * Specifies if edges should appear in the foreground regardless of their order
   * in the model. If {@link keepEdgesInForeground} and {@link keepEdgesInBackground} are
   * both `true` then the normal order is applied.
   * @default false
   */
  keepEdgesInForeground: boolean = false;

  /**
   * Specifies if edges should appear in the background regardless of their order
   * in the model. If {@link keepEdgesInForeground} and {@link keepEdgesInBackground} are
   * both `true` then the normal order is applied.
   * @default false
   */
  keepEdgesInBackground: boolean = false;

  /**
   * Specifies if a child should be constrained inside the parent bounds after a
   * move or resize of the child.
   * @default true
   */
  constrainChildren: boolean = true;

  /**
   * Specifies if child cells with relative geometries should be constrained
   * inside the parent bounds, if {@link constrainChildren} is `true`, and/or the
   * {@link maximumGraphBounds}.
   * @default false
   */
  constrainRelativeChildren: boolean = false;

  /**
   * Specifies the return value for {@link isRecursiveResize}.
   * @default false (for backwards compatibility)
   */
  recursiveResize: boolean = false;

  /**
   * Specifies if the scale and translate should be reset if the root changes in
   * the model.
   * @default true
   */
  resetViewOnRootChange: boolean = true;

  /**
   * Specifies if loops (aka self-references) are allowed.
   * @default false
   */
  allowLoops: boolean = false;

  /**
   * {@link EdgeStyle} to be used for loops. This is a fallback for loops if the
   * {@link mxConstants.STYLE_LOOP} is undefined.
   * @default {@link EdgeStyle.Loop}
   */
  defaultLoopStyle = EdgeStyle.Loop;

  /**
   * Specifies if multiple edges in the same direction between the same pair of
   * vertices are allowed.
   * @default true
   */
  multigraph: boolean = true;

  /**
   * Specifies if labels should be visible. This is used in {@link getLabel}. Default
   * is true.
   */
  labelsVisible: boolean = true;

  /**
   * Specifies the return value for {@link isHtmlLabel}.
   * @default false
   */
  htmlLabels: boolean = false;

  /**
   * Specifies the minimum scale to be applied in {@link fit}. Set this to `null` to allow any value.
   * @default 0.1
   */
  minFitScale: number = 0.1;

  /**
   * Specifies the maximum scale to be applied in {@link fit}. Set this to `null` to allow any value.
   * @default 8
   */
  maxFitScale: number = 8;

  /**
   * Specifies the {@link Image} for the image to be used to display a warning
   * overlay. See {@link setCellWarning}. Default value is mxClient.imageBasePath +
   * '/warning'.  The extension for the image depends on the platform. It is
   * '.png' on the Mac and '.gif' on all other platforms.
   */
  warningImage: Image = new Image(
    `${mxClient.imageBasePath}/warning${mxClient.IS_MAC ? '.png' : '.gif'}`,
    16,
    16
  );

  /**
   * Specifies the resource key for the error message to be displayed in
   * non-multigraphs when two vertices are already connected. If the resource
   * for this key does not exist then the value is used as the error message.
   * @default 'alreadyConnected'
   */
  alreadyConnectedResource: string =
    mxClient.language != 'none' ? 'alreadyConnected' : '';

  /**
   * Specifies the resource key for the warning message to be displayed when
   * a collapsed cell contains validation errors. If the resource for this
   * key does not exist then the value is used as the warning message.
   * @default 'containsValidationErrors'
   */
  containsValidationErrorsResource: string =
    mxClient.language != 'none' ? 'containsValidationErrors' : '';

  // TODO: Document me!!
  batchUpdate(fn: Function): void {
    (<Model>this.getModel()).beginUpdate();
    try {
      fn();
    } finally {
      (<Model>this.getModel()).endUpdate();
    }
  }

  /**
   * Creates the tooltip-, panning-, connection- and graph-handler (in this
   * order). This is called in the constructor before {@link init} is called.
   */
  createHandlers(): void {
    this.tooltipHandler = this.createTooltipHandler();
    this.tooltipHandler.setEnabled(false);
    this.selectionCellsHandler = this.createSelectionCellsHandler();
    this.connectionHandler = this.createConnectionHandler();
    this.connectionHandler.setEnabled(false);
    this.graphHandler = this.createGraphHandler();
    this.popupMenuHandler = this.createPopupMenuHandler();
  }

  /**
   * Creates and returns a new {@link TooltipHandler} to be used in this graph.
   */
  createTooltipHandler(): TooltipHandler {
    return new TooltipHandler(this);
  }

  /**
   * Creates and returns a new {@link TooltipHandler} to be used in this graph.
   */
  createSelectionCellsHandler(): SelectionCellsHandler {
    return new SelectionCellsHandler(this);
  }

  /**
   * Creates and returns a new {@link ConnectionHandler} to be used in this graph.
   */
  createConnectionHandler(): ConnectionHandler {
    return new ConnectionHandler(this);
  }

  /**
   * Creates and returns a new {@link GraphHandler} to be used in this graph.
   */
  createGraphHandler(): GraphHandler {
    return new GraphHandler(this);
  }

  /**
   * Creates and returns a new {@link PopupMenuHandler} to be used in this graph.
   */
  createPopupMenuHandler(): PopupMenuHandler {
    return new PopupMenuHandler(this);
  }

  /**
   * Creates a new {@link mxGraphSelectionModel} to be used in this graph.
   */
  createSelectionModel(): mxGraphSelectionModel {
    return new mxGraphSelectionModel(this);
  }

  /**
   * Creates a new {@link mxGraphSelectionModel} to be used in this graph.
   */
  createStylesheet(): Stylesheet {
    return new Stylesheet();
  }

  /**
   * Creates a new {@link GraphView} to be used in this graph.
   */
  createGraphView(): GraphView {
    return new GraphView(this);
  }

  /**
   * Creates a new {@link CellRenderer} to be used in this graph.
   */
  createCellRenderer(): CellRenderer {
    return new CellRenderer();
  }

  /**
   * Creates a new {@link CellEditor} to be used in this graph.
   */
  createCellEditor(): CellEditor {
    return new CellEditor(this);
  }

  /**
   * Returns the {@link Model} that contains the cells.
   */
  getModel(): Model {
    return <Model>this.model;
  }

  /**
   * Returns the {@link GraphView} that contains the {@link mxCellStates}.
   */
  getView(): GraphView {
    return <GraphView>this.view;
  }

  /**
   * Returns the {@link Stylesheet} that defines the style.
   */
  getStylesheet(): Stylesheet | null {
    return this.stylesheet;
  }

  /**
   * Sets the {@link Stylesheet} that defines the style.
   */
  setStylesheet(stylesheet: Stylesheet | null): void {
    this.stylesheet = stylesheet;
  }

  /**
   * Called when the graph model changes. Invokes {@link processChange} on each
   * item of the given array to update the view accordingly.
   *
   * @param changes Array that contains the individual changes.
   */
  graphModelChanged(changes: any[]) {
    for (const change of changes) {
      this.processChange(change);
    }

    this.updateSelection();
    this.view.validate();
    this.sizeDidChange();
  }

  /**
   * Processes the given change and invalidates the respective cached data
   * in {@link GraphView}. This fires a {@link root} event if the root has changed in the
   * model.
   *
   * @param {(RootChange|ChildChange|TerminalChange|GeometryChange|ValueChange|StyleChange)} change - Object that represents the change on the model.
   */
  processChange(change: any): void {
    // Resets the view settings, removes all cells and clears
    // the selection if the root changes.
    if (change instanceof RootChange) {
      this.selection.clearSelection();
      this.setDefaultParent(null);
      this.cells.removeStateForCell(change.previous);

      if (this.resetViewOnRootChange) {
        this.view.scale = 1;
        this.view.translate.x = 0;
        this.view.translate.y = 0;
      }

      this.fireEvent(new EventObject(InternalEvent.ROOT));
    }

    // Adds or removes a child to the view by online invaliding
    // the minimal required portions of the cache, namely, the
    // old and new parent and the child.
    else if (change instanceof ChildChange) {
      const newParent = change.child.getParent();
      this.view.invalidate(change.child, true, true);

      if (!this.getModel().contains(newParent) || newParent.isCollapsed()) {
        this.view.invalidate(change.child, true, true);
        this.cells.removeStateForCell(change.child);

        // Handles special case of current root of view being removed
        if (this.view.currentRoot == change.child) {
          this.home();
        }
      }

      if (newParent != change.previous) {
        // Refreshes the collapse/expand icons on the parents
        if (newParent != null) {
          this.view.invalidate(newParent, false, false);
        }

        if (change.previous != null) {
          this.view.invalidate(change.previous, false, false);
        }
      }
    }

    // Handles two special cases where the shape does not need to be
    // recreated from scratch, it only needs to be invalidated.
    else if (change instanceof TerminalChange || change instanceof GeometryChange) {
      // Checks if the geometry has changed to avoid unnessecary revalidation
      if (
        change instanceof TerminalChange ||
        (change.previous == null && change.geometry != null) ||
        (change.previous != null && !change.previous.equals(change.geometry))
      ) {
        this.view.invalidate(change.cell);
      }
    }

    // Handles two special cases where only the shape, but no
    // descendants need to be recreated
    else if (change instanceof ValueChange) {
      this.view.invalidate(change.cell, false, false);
    }

    // Requires a new mxShape in JavaScript
    else if (change instanceof StyleChange) {
      this.view.invalidate(change.cell, true, true);
      const state = this.view.getState(change.cell);

      if (state != null) {
        state.invalidStyle = true;
      }
    }

    // Removes the state from the cache by default
    else if (change.cell != null && change.cell instanceof Cell) {
      this.cells.removeStateForCell(change.cell);
    }
  }

  /**
   * Scrolls the graph to the given point, extending the graph container if
   * specified.
   */
  scrollPointToVisible(
    x: number,
    y: number,
    extend: boolean = false,
    border: number = 20
  ): void {
    if (
      !this.timerAutoScroll &&
      (this.ignoreScrollbars || hasScrollbars(this.container))
    ) {
      const c = <HTMLElement>this.container;

      if (
        x >= c.scrollLeft &&
        y >= c.scrollTop &&
        x <= c.scrollLeft + c.clientWidth &&
        y <= c.scrollTop + c.clientHeight
      ) {
        let dx = c.scrollLeft + c.clientWidth - x;

        if (dx < border) {
          const old = c.scrollLeft;
          c.scrollLeft += border - dx;

          // Automatically extends the canvas size to the bottom, right
          // if the event is outside of the canvas and the edge of the
          // canvas has been reached. Notes: Needs fix for IE.
          if (extend && old === c.scrollLeft) {
            // @ts-ignore
            const root = this.view.getDrawPane().ownerSVGElement;
            const width = c.scrollWidth + border - dx;

            // Updates the clipping region. This is an expensive
            // operation that should not be executed too often.
            // @ts-ignore
            root.style.width = `${width}px`;

            c.scrollLeft += border - dx;
          }
        } else {
          dx = x - c.scrollLeft;

          if (dx < border) {
            c.scrollLeft -= border - dx;
          }
        }

        let dy = c.scrollTop + c.clientHeight - y;

        if (dy < border) {
          const old = c.scrollTop;
          c.scrollTop += border - dy;

          if (old == c.scrollTop && extend) {
            // @ts-ignore
            const root = this.view.getDrawPane().ownerSVGElement;
            const height = c.scrollHeight + border - dy;

            // Updates the clipping region. This is an expensive
            // operation that should not be executed too often.
            // @ts-ignore
            root.style.height = `${height}px`;

            c.scrollTop += border - dy;
          }
        } else {
          dy = y - c.scrollTop;

          if (dy < border) {
            c.scrollTop -= border - dy;
          }
        }
      }
    } else if (
      this.allowAutoPanning &&
      !(<PanningHandler>this.panningHandler).isActive()
    ) {
      if (this.panningManager == null) {
        this.panningManager = this.createPanningManager();
      }
      this.panningManager.panTo(x + this.panDx, y + this.panDy);
    }
  }

  /**
   * Returns the size of the border and padding on all four sides of the
   * container. The left, top, right and bottom borders are stored in the x, y,
   * width and height of the returned {@link Rectangle}, respectively.
   */
  getBorderSizes(): Rectangle {
    const css = <CSSStyleDeclaration>getCurrentStyle(this.container);

    return new Rectangle(
      parseCssNumber(css.paddingLeft) +
        (css.borderLeftStyle != 'none' ? parseCssNumber(css.borderLeftWidth) : 0),
      parseCssNumber(css.paddingTop) +
        (css.borderTopStyle != 'none' ? parseCssNumber(css.borderTopWidth) : 0),
      parseCssNumber(css.paddingRight) +
        (css.borderRightStyle != 'none' ? parseCssNumber(css.borderRightWidth) : 0),
      parseCssNumber(css.paddingBottom) +
        (css.borderBottomStyle != 'none' ? parseCssNumber(css.borderBottomWidth) : 0)
    );
  }

  /**
   * Returns the preferred size of the background page if {@link preferPageSize} is true.
   */
  getPreferredPageSize(bounds: Rectangle, width: number, height: number): Rectangle {
    const { scale } = this.view;
    const tr = this.view.translate;
    const fmt = this.pageFormat;
    const ps = this.pageScale;
    const page = new Rectangle(
      0,
      0,
      Math.ceil(fmt.width * ps),
      Math.ceil(fmt.height * ps)
    );

    const hCount = this.pageBreaksVisible ? Math.ceil(width / page.width) : 1;
    const vCount = this.pageBreaksVisible ? Math.ceil(height / page.height) : 1;

    return new Rectangle(
      0,
      0,
      hCount * page.width + 2 + tr.x,
      vCount * page.height + 2 + tr.y
    );
  }

  /**
   * Function: fit
   *
   * Scales the graph such that the complete diagram fits into <container> and
   * returns the current scale in the view. To fit an initial graph prior to
   * rendering, set <mxGraphView.rendering> to false prior to changing the model
   * and execute the following after changing the model.
   *
   * (code)
   * graph.fit();
   * graph.view.rendering = true;
   * graph.refresh();
   * (end)
   *
   * To fit and center the graph, the following code can be used.
   *
   * (code)
   * let margin = 2;
   * let max = 3;
   *
   * let bounds = graph.getGraphBounds();
   * let cw = graph.container.clientWidth - margin;
   * let ch = graph.container.clientHeight - margin;
   * let w = bounds.width / graph.view.scale;
   * let h = bounds.height / graph.view.scale;
   * let s = Math.min(max, Math.min(cw / w, ch / h));
   *
   * graph.view.scaleAndTranslate(s,
   *   (margin + cw - w * s) / (2 * s) - bounds.x / graph.view.scale,
   *   (margin + ch - h * s) / (2 * s) - bounds.y / graph.view.scale);
   * (end)
   *
   * Parameters:
   *
   * border - Optional number that specifies the border. Default is <border>.
   * keepOrigin - Optional boolean that specifies if the translate should be
   * changed. Default is false.
   * margin - Optional margin in pixels. Default is 0.
   * enabled - Optional boolean that specifies if the scale should be set or
   * just returned. Default is true.
   * ignoreWidth - Optional boolean that specifies if the width should be
   * ignored. Default is false.
   * ignoreHeight - Optional boolean that specifies if the height should be
   * ignored. Default is false.
   * maxHeight - Optional maximum height.
   */
  fit(
    border: number = this.getBorder(),
    keepOrigin: boolean = false,
    margin: number = 0,
    enabled: boolean = true,
    ignoreWidth: boolean = false,
    ignoreHeight: boolean = false,
    maxHeight: number | null = null
  ): number {
    if (this.container != null) {
      // Adds spacing and border from css
      const cssBorder = this.getBorderSizes();
      let w1: number = this.container.offsetWidth - cssBorder.x - cssBorder.width - 1;
      let h1: number =
        maxHeight != null
          ? maxHeight
          : this.container.offsetHeight - cssBorder.y - cssBorder.height - 1;
      let bounds = this.view.getGraphBounds();

      if (bounds.width > 0 && bounds.height > 0) {
        if (keepOrigin && bounds.x != null && bounds.y != null) {
          bounds = bounds.clone();
          bounds.width += bounds.x;
          bounds.height += bounds.y;
          bounds.x = 0;
          bounds.y = 0;
        }

        // LATER: Use unscaled bounding boxes to fix rounding errors
        const s = this.view.scale;
        let w2 = bounds.width / s;
        let h2 = bounds.height / s;

        // Fits to the size of the background image if required
        if (this.backgroundImage != null) {
          w2 = Math.max(w2, this.backgroundImage.width - bounds.x / s);
          h2 = Math.max(h2, this.backgroundImage.height - bounds.y / s);
        }

        const b: number = (keepOrigin ? border : 2 * border) + margin + 1;

        w1 -= b;
        h1 -= b;

        let s2 = ignoreWidth
          ? h1 / h2
          : ignoreHeight
          ? w1 / w2
          : Math.min(w1 / w2, h1 / h2);

        if (this.minFitScale != null) {
          s2 = Math.max(s2, this.minFitScale);
        }

        if (this.maxFitScale != null) {
          s2 = Math.min(s2, this.maxFitScale);
        }

        if (enabled) {
          if (!keepOrigin) {
            if (!hasScrollbars(this.container)) {
              const x0 =
                bounds.x != null
                  ? Math.floor(
                      this.view.translate.x - bounds.x / s + border / s2 + margin / 2
                    )
                  : border;
              const y0 =
                bounds.y != null
                  ? Math.floor(
                      this.view.translate.y - bounds.y / s + border / s2 + margin / 2
                    )
                  : border;

              this.view.scaleAndTranslate(s2, x0, y0);
            } else {
              this.view.setScale(s2);
              const b2 = this.getGraphBounds();

              if (b2.x != null) {
                this.container.scrollLeft = b2.x;
              }

              if (b2.y != null) {
                this.container.scrollTop = b2.y;
              }
            }
          } else if (this.view.scale != s2) {
            this.view.setScale(s2);
          }
        } else {
          return s2;
        }
      }
    }
    return this.view.scale;
  }

  /**
   * Resizes the container for the given graph width and height.
   */
  doResizeContainer(width: number, height: number): void {
    if (this.maximumContainerSize != null) {
      width = Math.min(this.maximumContainerSize.width, width);
      height = Math.min(this.maximumContainerSize.height, height);
    }
    const container = <HTMLElement>this.container;
    container.style.width = `${Math.ceil(width)}px`;
    container.style.height = `${Math.ceil(height)}px`;
  }

  /*****************************************************************************
   * Group: UNCLASSIFIED
   *****************************************************************************/

  /**
   * Creates a new handler for the given cell state. This implementation
   * returns a new {@link EdgeHandler} of the corresponding cell is an edge,
   * otherwise it returns an {@link VertexHandler}.
   *
   * @param state {@link mxCellState} whose handler should be created.
   */
  createHandler(state: CellState): mxEdgeHandler | VertexHandler | null {
    let result: mxEdgeHandler | VertexHandler | null = null;

    if (state.cell.isEdge()) {
      const source = state.getVisibleTerminalState(true);
      const target = state.getVisibleTerminalState(false);
      const geo = (<Cell>state.cell).getGeometry();

      const edgeStyle = this.getView().getEdgeStyle(
        state,
        geo != null ? geo.points : null,
        <CellState>source,
        <CellState>target
      );
      result = this.createEdgeHandler(state, edgeStyle);
    } else {
      result = this.createVertexHandler(state);
    }
    return result;
  }

  /**
   * Hooks to create a new {@link VertexHandler} for the given {@link CellState}.
   *
   * @param state {@link mxCellState} to create the handler for.
   */
  createVertexHandler(state: CellState): VertexHandler {
    return new VertexHandler(state);
  }

  /**
   * Hooks to create a new {@link EdgeHandler} for the given {@link CellState}.
   *
   * @param state {@link mxCellState} to create the handler for.
   */
  createEdgeHandler(state: CellState, edgeStyle: any): mxEdgeHandler {
    let result = null;
    if (
      edgeStyle == EdgeStyle.Loop ||
      edgeStyle == EdgeStyle.ElbowConnector ||
      edgeStyle == EdgeStyle.SideToSide ||
      edgeStyle == EdgeStyle.TopToBottom
    ) {
      result = this.createElbowEdgeHandler(state);
    } else if (
      edgeStyle == EdgeStyle.SegmentConnector ||
      edgeStyle == EdgeStyle.OrthConnector
    ) {
      result = this.createEdgeSegmentHandler(state);
    } else {
      result = new mxEdgeHandler(state);
    }
    return result;
  }

  /**
   * Hooks to create a new {@link EdgeSegmentHandler} for the given {@link CellState}.
   *
   * @param state {@link mxCellState} to create the handler for.
   */
  createEdgeSegmentHandler(state: CellState): mxEdgeSegmentHandler {
    return new mxEdgeSegmentHandler(state);
  }

  /**
   * Hooks to create a new {@link ElbowEdgeHandler} for the given {@link CellState}.
   *
   * @param state {@link mxCellState} to create the handler for.
   */
  createElbowEdgeHandler(state: CellState): ElbowEdgeHandler {
    return new ElbowEdgeHandler(state);
  }

  /*****************************************************************************
   * Group: Drilldown
   *****************************************************************************/

  /**
   * Returns the current root of the displayed cell hierarchy. This is a
   * shortcut to {@link GraphView.currentRoot} in {@link GraphView}.
   */
  getCurrentRoot(): Cell | null {
    return this.view.currentRoot;
  }

  /**
   * Returns the translation to be used if the given cell is the root cell as
   * an {@link Point}. This implementation returns null.
   *
   * To keep the children at their absolute position while stepping into groups,
   * this function can be overridden as follows.
   *
   * @example
   * ```javascript
   * var offset = new mxPoint(0, 0);
   *
   * while (cell != null)
   * {
   *   var geo = this.model.getGeometry(cell);
   *
   *   if (geo != null)
   *   {
   *     offset.x -= geo.x;
   *     offset.y -= geo.y;
   *   }
   *
   *   cell = this.model.getParent(cell);
   * }
   *
   * return offset;
   * ```
   *
   * @param cell {@link mxCell} that represents the root.
   */
  getTranslateForRoot(cell: Cell): Point | null {
    return null;
  }

  /**
   * Returns the offset to be used for the cells inside the given cell. The
   * root and layer cells may be identified using {@link Model.isRoot} and
   * {@link Model.isLayer}. For all other current roots, the
   * {@link GraphView.currentRoot} field points to the respective cell, so that
   * the following holds: cell == this.view.currentRoot. This implementation
   * returns null.
   *
   * @param cell {@link mxCell} whose offset should be returned.
   */
  // getChildOffsetForCell(cell: mxCell): number;
  getChildOffsetForCell(cell: Cell): Point | null {
    return null;
  }

  /**
   * Uses the root of the model as the root of the displayed cell hierarchy
   * and selects the previous root.
   */
  home() {
    const current = this.getCurrentRoot();

    if (current != null) {
      this.view.setCurrentRoot(null);
      const state = this.view.getState(current);

      if (state != null) {
        this.selection.setSelectionCell(current);
      }
    }
  }

  /**
   * Returns true if the given cell is a valid root for the cell display
   * hierarchy. This implementation returns true for all non-null values.
   *
   * @param cell {@link mxCell} which should be checked as a possible root.
   */
  isValidRoot(cell: Cell) {
    return cell != null;
  }

  /*****************************************************************************
   * Group: Graph display
   *****************************************************************************/

  /**
   * Returns the bounds of the visible graph. Shortcut to
   * {@link GraphView.getGraphBounds}. See also: {@link getBoundingBoxFromGeometry}.
   */
  getGraphBounds(): Rectangle {
    return this.view.getGraphBounds();
  }

  /**
   * Returns the bounds inside which the diagram should be kept as an
   * {@link Rectangle}.
   */
  getMaximumGraphBounds(): Rectangle | null {
    return this.maximumGraphBounds;
  }

  /**
   * Clears all cell states or the states for the hierarchy starting at the
   * given cell and validates the graph. This fires a refresh event as the
   * last step.
   *
   * @param cell Optional {@link Cell} for which the cell states should be cleared.
   */
  refresh(cell: Cell | null = null): void {
    if (cell) {
      this.view.clear(cell, false);
    } else {
      this.view.clear(undefined, true);
    }
    this.view.validate();
    this.sizeDidChange();
    this.fireEvent(new EventObject(InternalEvent.REFRESH));
  }

  /**
   * Centers the graph in the container.
   *
   * @param horizontal Optional boolean that specifies if the graph should be centered
   * horizontally. Default is `true`.
   * @param vertical Optional boolean that specifies if the graph should be centered
   * vertically. Default is `true`.
   * @param cx Optional float that specifies the horizontal center. Default is `0.5`.
   * @param cy Optional float that specifies the vertical center. Default is `0.5`.
   */
  center(
    horizontal: boolean = true,
    vertical: boolean = true,
    cx: number = 0.5,
    cy: number = 0.5
  ): void {
    const container = <HTMLElement>this.container;
    const _hasScrollbars = hasScrollbars(this.container);
    const padding = 2 * this.getBorder();
    const cw = container.clientWidth - padding;
    const ch = container.clientHeight - padding;
    const bounds = this.getGraphBounds();

    const t = this.view.translate;
    const s = this.view.scale;

    let dx = horizontal ? cw - bounds.width : 0;
    let dy = vertical ? ch - bounds.height : 0;

    if (!_hasScrollbars) {
      this.view.setTranslate(
        horizontal ? Math.floor(t.x - bounds.x / s + (dx * cx) / s) : t.x,
        vertical ? Math.floor(t.y - bounds.y / s + (dy * cy) / s) : t.y
      );
    } else {
      bounds.x -= t.x;
      bounds.y -= t.y;

      const sw = container.scrollWidth;
      const sh = container.scrollHeight;

      if (sw > cw) {
        dx = 0;
      }

      if (sh > ch) {
        dy = 0;
      }

      this.view.setTranslate(
        Math.floor(dx / 2 - bounds.x),
        Math.floor(dy / 2 - bounds.y)
      );
      container.scrollLeft = (sw - cw) / 2;
      container.scrollTop = (sh - ch) / 2;
    }
  }

  /**
   * Returns true if perimeter points should be computed such that the
   * resulting edge has only horizontal or vertical segments.
   *
   * @param edge {@link mxCellState} that represents the edge.
   */
  isOrthogonal(edge: CellState): boolean {
    /*
    'orthogonal' defines if the connection points on either end of the edge should
    be computed so that the edge is vertical or horizontal if possible
    and if the point is not at a fixed location. Default is false.
    This also returns true if the edgeStyle of the edge is an elbow or
    entity.
     */
    const orthogonal = edge.style.orthogonal;

    if (orthogonal != null) {
      return orthogonal;
    }

    const tmp = this.view.getEdgeStyle(edge);

    return (
      tmp === EdgeStyle.SegmentConnector ||
      tmp === EdgeStyle.ElbowConnector ||
      tmp === EdgeStyle.SideToSide ||
      tmp === EdgeStyle.TopToBottom ||
      tmp === EdgeStyle.EntityRelation ||
      tmp === EdgeStyle.OrthConnector
    );
  }

  /*****************************************************************************
   * Group: Graph appearance
   *****************************************************************************/

  /**
   * Returns the {@link backgroundImage} as an {@link Image}.
   */
  getBackgroundImage(): Image | null {
    return this.backgroundImage;
  }

  /**
   * Sets the new {@link backgroundImage}.
   *
   * @param image New {@link Image} to be used for the background.
   */
  setBackgroundImage(image: Image | null): void {
    this.backgroundImage = image;
  }

  /**
   * Returns the textual representation for the given cell. This
   * implementation returns the nodename or string-representation of the user
   * object.
   *
   *
   * The following returns the label attribute from the cells user
   * object if it is an XML node.
   *
   * @example
   * ```javascript
   * graph.convertValueToString = function(cell)
   * {
   * 	return cell.getAttribute('label');
   * }
   * ```
   *
   * See also: {@link cellLabelChanged}.
   *
   * @param cell {@link mxCell} whose textual representation should be returned.
   */
  convertValueToString(cell: Cell): string {
    const value = cell.getValue();

    if (value != null) {
      if (isNode(value)) {
        return value.nodeName;
      }
      if (typeof value.toString === 'function') {
        return value.toString();
      }
    }
    return '';
  }

  /**
   * Returns the string to be used as the link for the given cell. This
   * implementation returns null.
   *
   * @param cell {@link mxCell} whose tooltip should be returned.
   */
  getLinkForCell(cell: Cell): string | null {
    return null;
  }

  /**
   * Returns the value of {@link border}.
   */
  getBorder(): number {
    return this.border;
  }

  /**
   * Sets the value of {@link border}.
   *
   * @param value Positive integer that represents the border to be used.
   */
  setBorder(value: number): void {
    this.border = value;
  }

  /*****************************************************************************
   * Group: Graph behaviour
   *****************************************************************************/

  /**
   * Returns {@link resizeContainer}.
   */
  isResizeContainer(): boolean {
    return this.resizeContainer;
  }

  /**
   * Sets {@link resizeContainer}.
   *
   * @param value Boolean indicating if the container should be resized.
   */
  setResizeContainer(value: boolean) {
    this.resizeContainer = value;
  }

  /**
   * Returns true if the graph is {@link enabled}.
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Specifies if the graph should allow any interactions. This
   * implementation updates {@link enabled}.
   *
   * @param value Boolean indicating if the graph should be enabled.
   */
  setEnabled(value: boolean): void {
    this.enabled = value;
  }

  /**
   * Returns {@link multigraph} as a boolean.
   */
  isMultigraph(): boolean {
    return this.multigraph;
  }

  /**
   * Specifies if the graph should allow multiple connections between the
   * same pair of vertices.
   *
   * @param value Boolean indicating if the graph allows multiple connections
   * between the same pair of vertices.
   */
  setMultigraph(value: boolean): void {
    this.multigraph = value;
  }

  /**
   * Returns {@link allowLoops} as a boolean.
   */
  isAllowLoops(): boolean {
    return this.allowLoops;
  }

  /**
   * Specifies if loops are allowed.
   *
   * @param value Boolean indicating if loops are allowed.
   */
  setAllowLoops(value: boolean): void {
    this.allowLoops = value;
  }

  /**
   * Returns {@link recursiveResize}.
   *
   * @param state {@link mxCellState} that is being resized.
   */
  isRecursiveResize(state: CellState | null = null): boolean {
    return this.recursiveResize;
  }

  /**
   * Sets {@link recursiveResize}.
   *
   * @param value New boolean value for {@link recursiveResize}.
   */
  setRecursiveResize(value: boolean): void {
    this.recursiveResize = value;
  }

  /**
   * Returns {@link allowNegativeCoordinates}.
   */
  isAllowNegativeCoordinates(): boolean {
    return this.allowNegativeCoordinates;
  }

  /**
   * Sets {@link allowNegativeCoordinates}.
   */
  setAllowNegativeCoordinates(value: boolean): void {
    this.allowNegativeCoordinates = value;
  }

  /**
   * Returns a decimal number representing the amount of the width and height
   * of the given cell that is allowed to overlap its parent. A value of 0
   * means all children must stay inside the parent, 1 means the child is
   * allowed to be placed outside of the parent such that it touches one of
   * the parents sides. If {@link isAllowOverlapParent} returns false for the given
   * cell, then this method returns 0.
   *
   * @param cell {@link mxCell} for which the overlap ratio should be returned.
   */
  getOverlap(cell: Cell): number {
    return this.isAllowOverlapParent(cell) ? this.defaultOverlap : 0;
  }

  /**
   * Returns true if the given cell is allowed to be placed outside of the
   * parents area.
   *
   * @param cell {@link mxCell} that represents the child to be checked.
   */
  isAllowOverlapParent(cell: Cell): boolean {
    return false;
  }

  /*****************************************************************************
   * Group: Cell retrieval
   *****************************************************************************/

  /**
   * Returns {@link defaultParent} or {@link GraphView.currentRoot} or the first child
   * child of {@link Model.root} if both are null. The value returned by
   * this function should be used as the parent for new cells (aka default
   * layer).
   */
  getDefaultParent(): Cell {
    let parent = this.getCurrentRoot();

    if (parent == null) {
      parent = this.defaultParent;

      if (parent == null) {
        const root = <Cell>this.getModel().getRoot();
        parent = root.getChildAt(0);
      }
    }
    return <Cell>parent;
  }

  /**
   * Sets the {@link defaultParent} to the given cell. Set this to null to return
   * the first child of the root in getDefaultParent.
   */
  setDefaultParent(cell: Cell | null): void {
    this.defaultParent = cell;
  }

  /**
   * Destroys the graph and all its resources.
   */
  destroy(): void {
    if (!this.destroyed) {
      this.destroyed = true;
      // @ts-ignore
      this.container = null;

      this.tooltipHandler?.destroy?.();
      this.selectionCellsHandler?.destroy?.();
      this.panningHandler?.destroy?.();
      this.popupMenuHandler?.destroy?.();
      this.connectionHandler?.destroy?.();
      this.graphHandler?.destroy?.();
      this.cellEditor?.destroy?.();
      this.view?.destroy?.();

      if (this.model != null && this.graphModelChangeListener != null) {
        this.getModel().removeListener(this.graphModelChangeListener);
        this.graphModelChangeListener = null;
      }
    }
  }
}

export default Graph;
// import("../../serialization/mxGraphCodec");
