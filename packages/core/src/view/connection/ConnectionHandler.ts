/**
 * Copyright (c) 2006-2016, JGraph Ltd
 * Copyright (c) 2006-2016, Gaudenz Alder
 */
import Geometry from '../geometry/Geometry';
import Cell from '../cell/datatypes/Cell';
import Point from '../geometry/Point';
import EventObject from '../event/EventObject';
import InternalEvent from '../event/InternalEvent';
import {
  CURSOR_CONNECT,
  DEFAULT_VALID_COLOR,
  DIALECT_STRICTHTML,
  DIALECT_SVG,
  HIGHLIGHT_STROKEWIDTH,
  INVALID_COLOR,
  OUTLINE_HIGHLIGHT_COLOR,
  OUTLINE_HIGHLIGHT_STROKEWIDTH,
  TOOLTIP_VERTICAL_OFFSET,
  VALID_COLOR,
} from '../../util/Constants';
import utils, {
  convertPoint,
  getOffset,
  getRotatedPoint,
  getValue,
  toRadians,
} from '../../util/Utils';
import InternalMouseEvent from '../event/InternalMouseEvent';
import ImageShape from '../geometry/shape/node/ImageShape';
import CellMarker from '../cell/CellMarker';
import ConstraintHandler from './ConstraintHandler';
import Polyline from '../geometry/shape/edge/Polyline';
import EventSource from '../event/EventSource';
import Rectangle from '../geometry/Rectangle';
import mxLog from '../../util/gui/mxLog';
import {
  getClientX,
  getClientY,
  isAltDown,
  isConsumed,
  isShiftDown,
} from '../../util/EventUtils';
import graph from '../Graph';
import Image from '../image/ImageBox';
import CellState from '../cell/datatypes/CellState';
import Graph from '../Graph';
import ConnectionConstraint from './ConnectionConstraint';
import Shape from '../geometry/shape/Shape';

type FactoryMethod = (source: Cell, target: Cell, style?: string) => Cell;

/**
 * Class: mxConnectionHandler
 *
 * Graph event handler that creates new connections. Uses <mxTerminalMarker>
 * for finding and highlighting the source and target vertices and
 * <factoryMethod> to create the edge instance. This handler is built-into
 * <mxGraph.connectionHandler> and enabled using <mxGraph.setConnectable>.
 *
 * Example:
 *
 * (code)
 * new mxConnectionHandler(graph, (source, target, style)=>
 * {
 *   edge = new mxCell('', new mxGeometry());
 *   edge.setEdge(true);
 *   edge.setStyle(style);
 *   edge.geometry.relative = true;
 *   return edge;
 * });
 * (end)
 *
 * Here is an alternative solution that just sets a specific user object for
 * new edges by overriding <insertEdge>.
 *
 * (code)
 * mxConnectionHandlerInsertEdge = insertEdge;
 * insertEdge = (parent, id, value, source, target, style)=>
 * {
 *   value = 'Test';
 *
 *   return mxConnectionHandlerInsertEdge.apply(this, arguments);
 * };
 * (end)
 *
 * Using images to trigger connections:
 *
 * This handler uses mxTerminalMarker to find the source and target cell for
 * the new connection and creates a new edge using <connect>. The new edge is
 * created using <createEdge> which in turn uses <factoryMethod> or creates a
 * new default edge.
 *
 * The handler uses a "highlight-paradigm" for indicating if a cell is being
 * used as a source or target terminal, as seen in other diagramming products.
 * In order to allow both, moving and connecting cells at the same time,
 * <mxConstants.DEFAULT_HOTSPOT> is used in the handler to determine the hotspot
 * of a cell, that is, the region of the cell which is used to trigger a new
 * connection. The constant is a value between 0 and 1 that specifies the
 * amount of the width and height around the center to be used for the hotspot
 * of a cell and its default value is 0.5. In addition,
 * <mxConstants.MIN_HOTSPOT_SIZE> defines the minimum number of pixels for the
 * width and height of the hotspot.
 *
 * This solution, while standards compliant, may be somewhat confusing because
 * there is no visual indicator for the hotspot and the highlight is seen to
 * switch on and off while the mouse is being moved in and out. Furthermore,
 * this paradigm does not allow to create different connections depending on
 * the highlighted hotspot as there is only one hotspot per cell and it
 * normally does not allow cells to be moved and connected at the same time as
 * there is no clear indication of the connectable area of the cell.
 *
 * To come across these issues, the handle has an additional <createIcons> hook
 * with a default implementation that allows to create one icon to be used to
 * trigger new connections. If this icon is specified, then new connections can
 * only be created if the image is clicked while the cell is being highlighted.
 * The <createIcons> hook may be overridden to create more than one
 * <mxImageShape> for creating new connections, but the default implementation
 * supports one image and is used as follows:
 *
 * In order to display the "connect image" whenever the mouse is over the cell,
 * an DEFAULT_HOTSPOT of 1 should be used:
 *
 * (code)
 * mxConstants.DEFAULT_HOTSPOT = 1;
 * (end)
 *
 * In order to avoid confusion with the highlighting, the highlight color
 * should not be used with a connect image:
 *
 * (code)
 * mxConstants.HIGHLIGHT_COLOR = null;
 * (end)
 *
 * To install the image, the connectImage field of the mxConnectionHandler must
 * be assigned a new <mxImage> instance:
 *
 * (code)
 * connectImage = new mxImage('images/green-dot.gif', 14, 14);
 * (end)
 *
 * This will use the green-dot.gif with a width and height of 14 pixels as the
 * image to trigger new connections. In createIcons the icon field of the
 * handler will be set in order to remember the icon that has been clicked for
 * creating the new connection. This field will be available under selectedIcon
 * in the connect method, which may be overridden to take the icon that
 * triggered the new connection into account. This is useful if more than one
 * icon may be used to create a connection.
 *
 * Group: Events
 *
 * Event: mxEvent.START
 *
 * Fires when a new connection is being created by the user. The <code>state</code>
 * property contains the state of the source cell.
 *
 * Event: mxEvent.CONNECT
 *
 * Fires between begin- and endUpdate in <connect>. The <code>cell</code>
 * property contains the inserted edge, the <code>event</code> and <code>target</code>
 * properties contain the respective arguments that were passed to <connect> (where
 * target corresponds to the dropTarget argument). Finally, the <code>terminal</code>
 * property corresponds to the target argument in <connect> or the clone of the source
 * terminal if <createTarget> is enabled.
 *
 * Note that the target is the cell under the mouse where the mouse button was released.
 * Depending on the logic in the handler, this doesn't necessarily have to be the target
 * of the inserted edge. To print the source, target or any optional ports IDs that the
 * edge is connected to, the following code can be used. To get more details about the
 * actual connection point, <mxGraph.getConnectionConstraint> can be used. To resolve
 * the port IDs, use <Transactions.getCell>.
 *
 * (code)
 * graph.connectionHandler.addListener(mxEvent.CONNECT, (sender, evt)=>
 * {
 *   let edge = evt.getProperty('cell');
 *   let source = graph.getModel().getTerminal(edge, true);
 *   let target = graph.getModel().getTerminal(edge, false);
 *
 *   let style = graph.getCellStyle(edge);
 *   let sourcePortId = style[mxConstants.STYLE_SOURCE_PORT];
 *   let targetPortId = style[mxConstants.STYLE_TARGET_PORT];
 *
 *   mxLog.show();
 *   mxLog.debug('connect', edge, source.id, target.id, sourcePortId, targetPortId);
 * });
 * (end)
 *
 * Event: mxEvent.RESET
 *
 * Fires when the <reset> method is invoked.
 *
 * Constructor: mxConnectionHandler
 *
 * Constructs an event handler that connects vertices using the specified
 * factory method to create the new edges. Modify
 * <mxConstants.ACTIVE_REGION> to setup the region on a cell which triggers
 * the creation of a new connection or use connect icons as explained
 * above.
 *
 * Parameters:
 *
 * graph - Reference to the enclosing <mxGraph>.
 * factoryMethod - Optional function to create the edge. The function takes
 * the source and target <mxCell> as the first and second argument and an
 * optional cell style from the preview as the third argument. It returns
 * the <mxCell> that represents the new edge.
 */
class ConnectionHandler extends EventSource {
  constructor(graph: Graph, factoryMethod: FactoryMethod | null = null) {
    super();

    this.graph = graph;
    this.factoryMethod = factoryMethod;
    this.init();

    // Handles escape keystrokes
    this.escapeHandler = () => {
      this.reset();
    };

    this.graph.addListener(InternalEvent.ESCAPE, this.escapeHandler);
  }

  // TODO: Document me!
  previous: CellState | null = null;
  iconState: CellState | null = null;
  icons: ImageShape[] | null = null;
  cell: Cell | null = null;
  currentPoint: Point | null = null;
  sourceConstraint: ConnectionConstraint | null = null;
  shape: Shape | null = null;
  icon: ImageShape | null = null;
  originalPoint: Point | null = null;
  currentState: CellState | null = null;
  selectedIcon: ImageShape | null = null;
  waypoints: Point[] | null = null;

  /**
   * Variable: graph
   *
   * Reference to the enclosing <mxGraph>.
   */
  graph: Graph;

  /**
   * Variable: factoryMethod
   *
   * Function that is used for creating new edges. The function takes the
   * source and target <mxCell> as the first and second argument and returns
   * a new <mxCell> that represents the edge. This is used in <createEdge>.
   */
  factoryMethod: FactoryMethod | null = null;

  /**
   * Variable: moveIconFront
   *
   * Specifies if icons should be displayed inside the graph container instead
   * of the overlay pane. This is used for HTML labels on vertices which hide
   * the connect icon. This has precendence over <moveIconBack> when set
   * to true. Default is false.
   */
  moveIconFront = false;

  /**
   * Variable: moveIconBack
   *
   * Specifies if icons should be moved to the back of the overlay pane. This can
   * be set to true if the icons of the connection handler conflict with other
   * handles, such as the vertex label move handle. Default is false.
   */
  moveIconBack = false;

  /**
   * Variable: connectImage
   *
   * <mxImage> that is used to trigger the creation of a new connection. This
   * is used in <createIcons>. Default is null.
   */

  connectImage: Image | null = null;

  /**
   * Variable: targetConnectImage
   *
   * Specifies if the connect icon should be centered on the target state
   * while connections are being previewed. Default is false.
   */
  targetConnectImage = false;

  /**
   * Variable: enabled
   *
   * Specifies if events are handled. Default is true.
   */
  enabled = true;

  /**
   * Variable: select
   *
   * Specifies if new edges should be selected. Default is true.
   */
  select = true;

  /**
   * Variable: createTarget
   *
   * Specifies if <createTargetVertex> should be called if no target was under the
   * mouse for the new connection. Setting this to true means the connection
   * will be drawn as valid if no target is under the mouse, and
   * <createTargetVertex> will be called before the connection is created between
   * the source cell and the newly created vertex in <createTargetVertex>, which
   * can be overridden to create a new target. Default is false.
   */
  createTarget = false;

  /**
   * Variable: marker
   *
   * Holds the <mxTerminalMarker> used for finding source and target cells.
   */
  // @ts-ignore
  marker: CellMarker;

  /**
   * Variable: constraintHandler
   *
   * Holds the <mxConstraintHandler> used for drawing and highlighting
   * constraints.
   */
  constraintHandler: ConstraintHandler | null = null;

  /**
   * Variable: error
   *
   * Holds the current validation error while connections are being created.
   */
  error: any = null;

  /**
   * Variable: waypointsEnabled
   *
   * Specifies if single clicks should add waypoints on the new edge. Default is
   * false.
   */
  waypointsEnabled = false;

  /**
   * Variable: ignoreMouseDown
   *
   * Specifies if the connection handler should ignore the state of the mouse
   * button when highlighting the source. Default is false, that is, the
   * handler only highlights the source if no button is being pressed.
   */
  ignoreMouseDown = false;

  /**
   * Variable: first
   *
   * Holds the <mxPoint> where the mouseDown took place while the handler is
   * active.
   */
  first: Point | null = null;

  /**
   * Variable: connectIconOffset
   *
   * Holds the offset for connect icons during connection preview.
   * Default is mxPoint(0, <mxConstants.TOOLTIP_VERTICAL_OFFSET>).
   * Note that placing the icon under the mouse pointer with an
   * offset of (0,0) will affect hit detection.
   */
  connectIconOffset = new Point(0, TOOLTIP_VERTICAL_OFFSET);

  /**
   * Variable: edgeState
   *
   * Optional <mxCellState> that represents the preview edge while the
   * handler is active. This is created in <createEdgeState>.
   */
  edgeState: CellState | null = null;

  /**
   * Variable: changeHandler
   *
   * Holds the change event listener for later removal.
   */
  changeHandler: any = null;

  /**
   * Variable: drillHandler
   *
   * Holds the drill event listener for later removal.
   */
  drillHandler: any = null;

  /**
   * Variable: mouseDownCounter
   *
   * Counts the number of mouseDown events since the start. The initial mouse
   * down event counts as 1.
   */
  mouseDownCounter = 0;

  /**
   * Variable: movePreviewAway
   *
   * Switch to enable moving the preview away from the mousepointer. This is required in browsers
   * where the preview cannot be made transparent to events and if the built-in hit detection on
   * the HTML elements in the page should be used. Default is the value of <mxClient.IS_VML>.
   */
  movePreviewAway = false;

  /**
   * Variable: outlineConnect
   *
   * Specifies if connections to the outline of a highlighted target should be
   * enabled. This will allow to place the connection point along the outline of
   * the highlighted target. Default is false.
   */
  outlineConnect = false;

  /**
   * Variable: livePreview
   *
   * Specifies if the actual shape of the edge state should be used for the preview.
   * Default is false. (Ignored if no edge state is created in <createEdgeState>.)
   */
  livePreview = false;

  /**
   * Variable: cursor
   *
   * Specifies the cursor to be used while the handler is active. Default is null.
   */
  cursor: string | null = null;

  /**
   * Variable: insertBeforeSource
   *
   * Specifies if new edges should be inserted before the source vertex in the
   * cell hierarchy. Default is false for backwards compatibility.
   */
  insertBeforeSource = false;

  escapeHandler: () => void;

  /**
   * Function: isEnabled
   *
   * Returns true if events are handled. This implementation
   * returns <enabled>.
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Function: setEnabled
   *
   * Enables or disables event handling. This implementation
   * updates <enabled>.
   *
   * Parameters:
   *
   * enabled - Boolean that specifies the new enabled state.
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  /**
   * Function: isInsertBefore
   *
   * Returns <insertBeforeSource> for non-loops and false for loops.
   *
   * Parameters:
   *
   * edge - <mxCell> that represents the edge to be inserted.
   * source - <mxCell> that represents the source terminal.
   * target - <mxCell> that represents the target terminal.
   * evt - Mousedown event of the connect gesture.
   * dropTarget - <mxCell> that represents the cell under the mouse when it was
   * released.
   */
  isInsertBefore(
    edge: Cell,
    source: Cell,
    target: Cell,
    evt: MouseEvent,
    dropTarget: Cell
  ) {
    return this.insertBeforeSource && source !== target;
  }

  /**
   * Function: isCreateTarget
   *
   * Returns <createTarget>.
   *
   * Parameters:
   *
   * evt - Current active native pointer event.
   */
  isCreateTarget(evt: Event) {
    return this.createTarget;
  }

  /**
   * Function: setCreateTarget
   *
   * Sets <createTarget>.
   */
  setCreateTarget(value: boolean) {
    this.createTarget = value;
  }

  /**
   * Function: createShape
   *
   * Creates the preview shape for new connections.
   */
  createShape() {
    // Creates the edge preview
    const shape =
      this.livePreview && this.edgeState
        ? this.graph.cellRenderer.createShape(this.edgeState)
        : new Polyline([], INVALID_COLOR);

    if (shape && shape.node) {
      shape.dialect = DIALECT_SVG;
      shape.scale = this.graph.view.scale;
      shape.pointerEvents = false;
      shape.isDashed = true;
      shape.init(this.graph.getView().getOverlayPane());
      InternalEvent.redirectMouseEvents(shape.node, this.graph, null);
    }

    return shape;
  }

  /**
   * Function: init
   *
   * Initializes the shapes required for this connection handler. This should
   * be invoked if <mxGraph.container> is assigned after the connection
   * handler has been created.
   */
  init(): void {
    this.graph.event.addMouseListener(this);
    this.marker = <CellMarker>this.createMarker();
    this.constraintHandler = new ConstraintHandler(this.graph);

    // Redraws the icons if the graph changes
    this.changeHandler = (sender) => {
      if (this.iconState != null) {
        this.iconState = this.graph.getView().getState(this.iconState.cell);
      }

      if (this.iconState != null) {
        this.redrawIcons(this.icons, this.iconState);
        this.constraintHandler.reset();
      } else if (
        this.previous != null &&
        this.graph.view.getState(this.previous.cell) == null
      ) {
        this.reset();
      }
    };

    this.graph.getModel().addListener(InternalEvent.CHANGE, this.changeHandler);
    this.graph.getView().addListener(InternalEvent.SCALE, this.changeHandler);
    this.graph.getView().addListener(InternalEvent.TRANSLATE, this.changeHandler);
    this.graph
      .getView()
      .addListener(InternalEvent.SCALE_AND_TRANSLATE, this.changeHandler);

    // Removes the icon if we step into/up or start editing
    this.drillHandler = (sender) => {
      this.reset();
    };

    this.graph.addListener(InternalEvent.START_EDITING, this.drillHandler);
    this.graph.getView().addListener(InternalEvent.DOWN, this.drillHandler);
    this.graph.getView().addListener(InternalEvent.UP, this.drillHandler);
  }

  /**
   * Function: isConnectableCell
   *
   * Returns true if the given cell is connectable. This is a hook to
   * disable floating connections. This implementation returns true.
   */
  isConnectableCell(cell: Cell) {
    return true;
  }

  /**
   * Function: createMarker
   *
   * Creates and returns the <mxCellMarker> used in <marker>.
   */
  createMarker(): CellMarker {
    const self = this;

    class MyCellMarker extends CellMarker {
      hotspotEnabled = true;

      // Overrides to return cell at location only if valid (so that
      // there is no highlight for invalid cells)
      getCell(me: InternalMouseEvent) {
        let cell = super.getCell(me);
        self.error = null;

        // Checks for cell at preview point (with grid)
        if (cell == null && self.currentPoint != null) {
          cell = self.graph.getCellAt(self.currentPoint.x, self.currentPoint.y);
        }

        // Uses connectable parent vertex if one exists
        if (cell != null && !cell.isConnectable()) {
          const parent = self.cell.getParent();

          if (parent.isVertex() && parent.isConnectable()) {
            cell = parent;
          }
        }

        if (
          (self.graph.swimlane.isSwimlane(cell) &&
            self.currentPoint != null &&
            self.graph.swimlane.hitsSwimlaneContent(
              cell,
              self.currentPoint.x,
              self.currentPoint.y
            )) ||
          !self.isConnectableCell(cell)
        ) {
          cell = null;
        }

        if (cell != null) {
          if (self.isConnecting()) {
            if (self.previous != null) {
              self.error = self.validateConnection(self.previous.cell, cell);

              if (self.error != null && self.error.length === 0) {
                cell = null;

                // Enables create target inside groups
                if (self.isCreateTarget(me.getEvent())) {
                  self.error = null;
                }
              }
            }
          } else if (!self.isValidSource(cell, me)) {
            cell = null;
          }
        } else if (
          self.isConnecting() &&
          !self.isCreateTarget(me.getEvent()) &&
          !self.graph.allowDanglingEdges
        ) {
          self.error = '';
        }

        return cell;
      }

      // Sets the highlight color according to validateConnection
      isValidState(state: CellState) {
        if (self.isConnecting()) {
          return self.error == null;
        }
        return super.isValidState(state);
      }

      // Overrides to use marker color only in highlight mode or for
      // target selection
      getMarkerColor(evt: Event, state: CellState, isValid: boolean): string | null {
        return self.connectImage == null || self.isConnecting()
          ? super.getMarkerColor(evt, state, isValid)
          : null;
      }

      // Overrides to use hotspot only for source selection otherwise
      // intersects always returns true when over a cell
      intersects(state: CellState, evt: InternalMouseEvent) {
        if (self.connectImage != null || self.isConnecting()) {
          return true;
        }
        return super.intersects(state, evt);
      }
    }

    return <CellMarker>new MyCellMarker(this.graph);
  }

  /**
   * Function: start
   *
   * Starts a new connection for the given state and coordinates.
   */
  start(state: CellState, x: number, y: number, edgeState: CellState): void {
    this.previous = state;
    this.first = new Point(x, y);
    this.edgeState = edgeState != null ? edgeState : this.createEdgeState(null);

    // Marks the source state
    this.marker.currentColor = this.marker.validColor;
    this.marker.markedState = state;
    this.marker.mark();

    this.fireEvent(new EventObject(InternalEvent.START, 'state', this.previous));
  }

  /**
   * Function: isConnecting
   *
   * Returns true if the source terminal has been clicked and a new
   * connection is currently being previewed.
   */
  isConnecting(): boolean {
    return this.first != null && this.shape != null;
  }

  /**
   * Function: isValidSource
   *
   * Returns <mxGraph.isValidSource> for the given source terminal.
   *
   * Parameters:
   *
   * cell - <mxCell> that represents the source terminal.
   * me - <mxMouseEvent> that is associated with this call.
   */
  isValidSource(cell: Cell, me: InternalMouseEvent): boolean {
    return this.graph.isValidSource(cell);
  }

  /**
   * Function: isValidTarget
   *
   * Returns true. The call to <mxGraph.isValidTarget> is implicit by calling
   * <mxGraph.getEdgeValidationError> in <validateConnection>. This is an
   * additional hook for disabling certain targets in this specific handler.
   *
   * Parameters:
   *
   * cell - <mxCell> that represents the target terminal.
   */
  isValidTarget(cell: Cell): boolean {
    return true;
  }

  /**
   * Function: validateConnection
   *
   * Returns the error message or an empty string if the connection for the
   * given source target pair is not valid. Otherwise it returns null. This
   * implementation uses <mxGraph.getEdgeValidationError>.
   *
   * Parameters:
   *
   * source - <mxCell> that represents the source terminal.
   * target - <mxCell> that represents the target terminal.
   */
  validateConnection(source: Cell, target: Cell): string {
    if (!this.isValidTarget(target)) {
      return '';
    }
    return this.graph.getEdgeValidationError(null, source, target);
  }

  /**
   * Function: getConnectImage
   *
   * Hook to return the <mxImage> used for the connection icon of the given
   * <mxCellState>. This implementation returns <connectImage>.
   *
   * Parameters:
   *
   * state - <mxCellState> whose connect image should be returned.
   */
  getConnectImage(state: CellState): Image | null {
    return this.connectImage;
  }

  /**
   * Function: isMoveIconToFrontForState
   *
   * Returns true if the state has a HTML label in the graph's container, otherwise
   * it returns <moveIconFront>.
   *
   * Parameters:
   *
   * state - <mxCellState> whose connect icons should be returned.
   */
  isMoveIconToFrontForState(state: CellState): boolean {
    if (state.text != null && state.text.node.parentNode === this.graph.container) {
      return true;
    }
    return this.moveIconFront;
  }

  /**
   * Function: createIcons
   *
   * Creates the array <mxImageShapes> that represent the connect icons for
   * the given <mxCellState>.
   *
   * Parameters:
   *
   * state - <mxCellState> whose connect icons should be returned.
   */
  createIcons(state: CellState): ImageShape[] | null {
    const image = this.getConnectImage(state);

    if (image != null && state != null) {
      this.iconState = state;
      const icons = [];

      // Cannot use HTML for the connect icons because the icon receives all
      // mouse move events in IE, must use VML and SVG instead even if the
      // connect-icon appears behind the selection border and the selection
      // border consumes the events before the icon gets a chance
      const bounds = new Rectangle(0, 0, image.width, image.height);
      const icon = new ImageShape(bounds, image.src, null, null, 0);
      icon.preserveImageAspect = false;

      if (this.isMoveIconToFrontForState(state)) {
        icon.dialect = DIALECT_STRICTHTML;
        icon.init(this.graph.container);
      } else {
        icon.dialect = DIALECT_SVG;
        icon.init(this.graph.getView().getOverlayPane());

        // Move the icon back in the overlay pane
        if (this.moveIconBack && icon.node.previousSibling != null) {
          icon.node.parentNode.insertBefore(icon.node, icon.node.parentNode.firstChild);
        }
      }

      icon.node.style.cursor = CURSOR_CONNECT;

      // Events transparency
      const getState = () => {
        return this.currentState != null ? this.currentState : state;
      };

      // Updates the local icon before firing the mouse down event.
      const mouseDown = (evt) => {
        if (!isConsumed(evt)) {
          this.icon = icon;
          this.graph.fireMouseEvent(
            InternalEvent.MOUSE_DOWN,
            new InternalMouseEvent(evt, getState())
          );
        }
      };

      InternalEvent.redirectMouseEvents(icon.node, this.graph, getState, mouseDown);

      icons.push(icon);
      this.redrawIcons(icons, this.iconState);

      return icons;
    }

    return null;
  }

  /**
   * Function: redrawIcons
   *
   * Redraws the given array of <mxImageShapes>.
   *
   * Parameters:
   *
   * icons - Optional array of <mxImageShapes> to be redrawn.
   */
  redrawIcons(icons?: ImageShape[] | null, state?: CellState): void {
    if (icons != null && icons[0] != null && state != null) {
      const pos = this.getIconPosition(icons[0], state);
      icons[0].bounds.x = pos.x;
      icons[0].bounds.y = pos.y;
      icons[0].redraw();
    }
  }

  // TODO: Document me! ===========================================================================================================
  getIconPosition(icon: ImageShape, state: CellState): Point {
    const { scale } = this.graph.getView();
    let cx = state.getCenterX();
    let cy = state.getCenterY();

    if (this.graph.isSwimlane(state.cell)) {
      const size = this.graph.getStartSize(state.cell);

      cx = size.width !== 0 ? state.x + (size.width * scale) / 2 : cx;
      cy = size.height !== 0 ? state.y + (size.height * scale) / 2 : cy;

      const alpha = toRadians(getValue(state.style, 'rotation') || 0);

      if (alpha !== 0) {
        const cos = Math.cos(alpha);
        const sin = Math.sin(alpha);
        const ct = new Point(state.getCenterX(), state.getCenterY());
        const pt = getRotatedPoint(new Point(cx, cy), cos, sin, ct);
        cx = pt.x;
        cy = pt.y;
      }
    }
    return new Point(cx - icon.bounds.width / 2, cy - icon.bounds.height / 2);
  }

  /**
   * Function: destroyIcons
   *
   * Destroys the connect icons and resets the respective state.
   */
  destroyIcons(): void {
    if (this.icons != null) {
      for (let i = 0; i < this.icons.length; i += 1) {
        this.icons[i].destroy();
      }

      this.icons = null;
      this.icon = null;
      this.selectedIcon = null;
      this.iconState = null;
    }
  }

  /**
   * Function: isStartEvent
   *
   * Returns true if the given mouse down event should start this handler. The
   * This implementation returns true if the event does not force marquee
   * selection, and the currentConstraint and currentFocus of the
   * <constraintHandler> are not null, or <previous> and <error> are not null and
   * <icons> is null or <icons> and <icon> are not null.
   */
  isStartEvent(me: InternalMouseEvent): boolean {
    return (
      (this.constraintHandler.currentFocus !== null &&
        this.constraintHandler.currentConstraint !== null) ||
      (this.previous !== null &&
        this.error === null &&
        (this.icons === null || this.icon !== null))
    );
  }

  /**
   * Function: mouseDown
   *
   * Handles the event by initiating a new connection.
   */
  mouseDown(sender: any, me: InternalMouseEvent): void {
    this.mouseDownCounter += 1;

    if (
      this.isEnabled() &&
      this.graph.isEnabled() &&
      !me.isConsumed() &&
      !this.isConnecting() &&
      this.isStartEvent(me)
    ) {
      if (
        this.constraintHandler.currentConstraint != null &&
        this.constraintHandler.currentFocus != null &&
        this.constraintHandler.currentPoint != null
      ) {
        this.sourceConstraint = this.constraintHandler.currentConstraint;
        this.previous = this.constraintHandler.currentFocus;
        this.first = this.constraintHandler.currentPoint.clone();
      } else {
        // Stores the location of the initial mousedown
        this.first = new Point(me.getGraphX(), me.getGraphY());
      }

      this.edgeState = this.createEdgeState(me);
      this.mouseDownCounter = 1;

      if (this.waypointsEnabled && this.shape == null) {
        this.waypoints = null;
        this.shape = this.createShape();

        if (this.edgeState != null) {
          this.shape.apply(this.edgeState);
        }
      }

      // Stores the starting point in the geometry of the preview
      if (this.previous == null && this.edgeState != null) {
        const pt = this.graph.getPointForEvent(me.getEvent());
        this.edgeState.cell.geometry.setTerminalPoint(pt, true);
      }

      this.fireEvent(new EventObject(InternalEvent.START, 'state', this.previous));

      me.consume();
    }

    this.selectedIcon = this.icon;
    this.icon = null;
  }

  /**
   * Function: isImmediateConnectSource
   *
   * Returns true if a tap on the given source state should immediately start
   * connecting. This implementation returns true if the state is not movable
   * in the graph.
   */
  isImmediateConnectSource(state: CellState): boolean {
    return !this.graph.isCellMovable(state.cell);
  }

  /**
   * Function: createEdgeState
   *
   * Hook to return an <mxCellState> which may be used during the preview.
   * This implementation returns null.
   *
   * Use the following code to create a preview for an existing edge style:
   *
   * (code)
   * graph.connectionHandler.createEdgeState(me)
   * {
   *   var edge = graph.createEdge(null, null, null, null, null, 'edgeStyle=elbowEdgeStyle');
   *
   *   return new mxCellState(this.graph.view, edge, this.graph.getCellStyle(edge));
   * };
   * (end)
   */
  createEdgeState(me: InternalMouseEvent): CellState | null {
    return null;
  }

  /**
   * Function: isOutlineConnectEvent
   *
   * Returns true if <outlineConnect> is true and the source of the event is the outline shape
   * or shift is pressed.
   */
  isOutlineConnectEvent(me: InternalMouseEvent): boolean {
    const offset = getOffset(this.graph.container);
    const evt = me.getEvent();

    const clientX = getClientX(evt);
    const clientY = getClientY(evt);

    const doc = document.documentElement;
    const left = (window.pageXOffset || doc.scrollLeft) - (doc.clientLeft || 0);
    const top = (window.pageYOffset || doc.scrollTop) - (doc.clientTop || 0);

    const gridX = this.currentPoint.x - this.graph.container.scrollLeft + offset.x - left;
    const gridY = this.currentPoint.y - this.graph.container.scrollTop + offset.y - top;

    return (
      this.outlineConnect &&
      !isShiftDown(me.getEvent()) &&
      (me.isSource(this.marker.highlight.shape) ||
        (isAltDown(me.getEvent()) && me.getState() != null) ||
        this.marker.highlight.isHighlightAt(clientX, clientY) ||
        ((gridX !== clientX || gridY !== clientY) &&
          me.getState() == null &&
          this.marker.highlight.isHighlightAt(gridX, gridY)))
    );
  }

  /**
   * Function: updateCurrentState
   *
   * Updates the current state for a given mouse move event by using
   * the <marker>.
   */
  updateCurrentState(me: InternalMouseEvent, point: Point): void {
    this.constraintHandler.update(
      me,
      this.first == null,
      false,
      this.first == null || me.isSource(this.marker.highlight.shape) ? null : point
    );

    if (
      this.constraintHandler.currentFocus != null &&
      this.constraintHandler.currentConstraint != null
    ) {
      // Handles special case where grid is large and connection point is at actual point in which
      // case the outline is not followed as long as we're < gridSize / 2 away from that point
      if (
        this.marker.highlight != null &&
        this.marker.highlight.state != null &&
        this.marker.highlight.state.cell === this.constraintHandler.currentFocus.cell
      ) {
        // Direct repaint needed if cell already highlighted
        if (this.marker.highlight.shape.stroke !== 'transparent') {
          this.marker.highlight.shape.stroke = 'transparent';
          this.marker.highlight.repaint();
        }
      } else {
        this.marker.markCell(this.constraintHandler.currentFocus.cell, 'transparent');
      }

      // Updates validation state
      if (this.previous != null) {
        this.error = this.validateConnection(
          this.previous.cell,
          this.constraintHandler.currentFocus.cell
        );

        if (this.error == null) {
          this.currentState = this.constraintHandler.currentFocus;
        }

        if (
          this.error != null ||
          (this.currentState != null && !this.isCellEnabled(this.currentState.cell))
        ) {
          this.constraintHandler.reset();
        }
      }
    } else {
      if (this.graph.isIgnoreTerminalEvent(me.getEvent())) {
        this.marker.reset();
        this.currentState = null;
      } else {
        this.marker.process(me);
        this.currentState = this.marker.getValidState();
      }

      if (this.currentState != null && !this.isCellEnabled(this.currentState.cell)) {
        this.constraintHandler.reset();
        this.marker.reset();
        this.currentState = null;
      }

      const outline = this.isOutlineConnectEvent(me);

      if (this.currentState != null && outline) {
        // Handles special case where mouse is on outline away from actual end point
        // in which case the grid is ignored and mouse point is used instead
        if (me.isSource(this.marker.highlight.shape)) {
          point = new point(me.getGraphX(), me.getGraphY());
        }

        const constraint = this.graph.getOutlineConstraint(point, this.currentState, me);
        this.constraintHandler.setFocus(me, this.currentState, false);
        this.constraintHandler.currentConstraint = constraint;
        this.constraintHandler.currentPoint = point;
      }

      if (this.outlineConnect) {
        if (this.marker.highlight != null && this.marker.highlight.shape != null) {
          const s = this.graph.view.scale;

          if (
            this.constraintHandler.currentConstraint != null &&
            this.constraintHandler.currentFocus != null
          ) {
            this.marker.highlight.shape.stroke = OUTLINE_HIGHLIGHT_COLOR;
            this.marker.highlight.shape.strokeWidth =
              OUTLINE_HIGHLIGHT_STROKEWIDTH / s / s;
            this.marker.highlight.repaint();
          } else if (this.marker.hasValidState()) {
            // Handles special case where actual end point of edge and current mouse point
            // are not equal (due to grid snapping) and there is no hit on shape or highlight
            // but ignores cases where parent is used for non-connectable child cells
            if (
              me.getCell().isConnectable() &&
              this.marker.getValidState() !== me.getState()
            ) {
              this.marker.highlight.shape.stroke = 'transparent';
              this.currentState = null;
            } else {
              this.marker.highlight.shape.stroke = DEFAULT_VALID_COLOR;
            }

            this.marker.highlight.shape.strokeWidth = HIGHLIGHT_STROKEWIDTH / s / s;
            this.marker.highlight.repaint();
          }
        }
      }
    }
  }

  /**
   * Function: isCellEnabled
   *
   * Returns true if the given cell does not allow new connections to be created.
   */
  isCellEnabled(cell: Cell): boolean {
    return true;
  }

  /**
   * Function: convertWaypoint
   *
   * Converts the given point from screen coordinates to model coordinates.
   */
  convertWaypoint(point: Point): void {
    const scale = this.graph.getView().getScale();
    const tr = this.graph.getView().getTranslate();

    point.x = point.x / scale - tr.x;
    point.y = point.y / scale - tr.y;
  }

  /**
   * Function: snapToPreview
   *
   * Called to snap the given point to the current preview. This snaps to the
   * first point of the preview if alt is not pressed.
   */
  snapToPreview(me: MouseEvent, point: Point): void {
    if (!isAltDown(me.getEvent()) && this.previous != null) {
      const tol = (this.graph.gridSize * this.graph.view.scale) / 2;
      const tmp =
        this.sourceConstraint != null
          ? this.first
          : new point(this.previous.getCenterX(), this.previous.getCenterY());

      if (Math.abs(tmp.x - me.getGraphX()) < tol) {
        point.x = tmp.x;
      }

      if (Math.abs(tmp.y - me.getGraphY()) < tol) {
        point.y = tmp.y;
      }
    }
  }

  /**
   * Function: mouseMove
   *
   * Handles the event by updating the preview edge or by highlighting
   * a possible source or target terminal.
   */
  mouseMove(sender: MouseEvent, me: InternalMouseEvent): void {
    if (
      !me.isConsumed() &&
      (this.ignoreMouseDown || this.first != null || !this.graph.isMouseDown)
    ) {
      // Handles special case when handler is disabled during highlight
      if (!this.isEnabled() && this.currentState != null) {
        this.destroyIcons();
        this.currentState = null;
      }

      const view = this.graph.getView();
      const { scale } = view;
      const tr = view.translate;
      let point = new Point(me.getGraphX(), me.getGraphY());
      this.error = null;

      if (this.graph.grid.isGridEnabledEvent(me.getEvent())) {
        point = new point(
          (this.graph.grid.snap(point.x / scale - tr.x) + tr.x) * scale,
          (this.graph.grid.snap(point.y / scale - tr.y) + tr.y) * scale
        );
      }

      this.snapToPreview(me, point);
      this.currentPoint = point;

      if (
        (this.first != null || (this.isEnabled() && this.graph.isEnabled())) &&
        (this.shape != null ||
          this.first == null ||
          Math.abs(me.getGraphX() - this.first.x) > this.graph.tolerance ||
          Math.abs(me.getGraphY() - this.first.y) > this.graph.tolerance)
      ) {
        this.updateCurrentState(me, point);
      }

      if (this.first != null) {
        let constraint = null;
        let current = point;

        // Uses the current point from the constraint handler if available
        if (
          this.constraintHandler.currentConstraint != null &&
          this.constraintHandler.currentFocus != null &&
          this.constraintHandler.currentPoint != null
        ) {
          constraint = this.constraintHandler.currentConstraint;
          current = this.constraintHandler.currentPoint.clone();
        } else if (
          this.previous != null &&
          !this.graph.isIgnoreTerminalEvent(me.getEvent()) &&
          isShiftDown(me.getEvent())
        ) {
          if (
            Math.abs(this.previous.getCenterX() - point.x) <
            Math.abs(this.previous.getCenterY() - point.y)
          ) {
            point.x = this.previous.getCenterX();
          } else {
            point.y = this.previous.getCenterY();
          }
        }

        let pt2 = this.first;

        // Moves the connect icon with the mouse
        if (this.selectedIcon != null) {
          const w = this.selectedIcon.bounds.width;
          const h = this.selectedIcon.bounds.height;

          if (this.currentState != null && this.targetConnectImage) {
            const pos = this.getIconPosition(this.selectedIcon, this.currentState);
            this.selectedIcon.bounds.x = pos.x;
            this.selectedIcon.bounds.y = pos.y;
          } else {
            const bounds = new Rectangle(
              me.getGraphX() + this.connectIconOffset.x,
              me.getGraphY() + this.connectIconOffset.y,
              w,
              h
            );
            this.selectedIcon.bounds = bounds;
          }

          this.selectedIcon.redraw();
        }

        // Uses edge state to compute the terminal points
        if (this.edgeState != null) {
          this.updateEdgeState(current, constraint);
          current = this.edgeState.absolutePoints[
            this.edgeState.absolutePoints.length - 1
          ];
          pt2 = this.edgeState.absolutePoints[0];
        } else {
          if (this.currentState != null) {
            if (this.constraintHandler.currentConstraint == null) {
              const tmp = this.getTargetPerimeterPoint(this.currentState, me);

              if (tmp != null) {
                current = tmp;
              }
            }
          }

          // Computes the source perimeter point
          if (this.sourceConstraint == null && this.previous != null) {
            const next =
              this.waypoints != null && this.waypoints.length > 0
                ? this.waypoints[0]
                : current;
            const tmp = this.getSourcePerimeterPoint(this.previous, next, me);

            if (tmp != null) {
              pt2 = tmp;
            }
          }
        }

        // Makes sure the cell under the mousepointer can be detected
        // by moving the preview shape away from the mouse. This
        // makes sure the preview shape does not prevent the detection
        // of the cell under the mousepointer even for slow gestures.
        if (this.currentState == null && this.movePreviewAway) {
          let tmp = pt2;

          if (this.edgeState != null && this.edgeState.absolutePoints.length >= 2) {
            const tmp2 = this.edgeState.absolutePoints[
              this.edgeState.absolutePoints.length - 2
            ];

            if (tmp2 != null) {
              tmp = tmp2;
            }
          }

          const dx = current.x - tmp.x;
          const dy = current.y - tmp.y;

          const len = Math.sqrt(dx * dx + dy * dy);

          if (len === 0) {
            return;
          }

          // Stores old point to reuse when creating edge
          this.originalPoint = current.clone();
          current.x -= (dx * 4) / len;
          current.y -= (dy * 4) / len;
        } else {
          this.originalPoint = null;
        }

        // Creates the preview shape (lazy)
        if (this.shape == null) {
          const dx = Math.abs(me.getGraphX() - this.first.x);
          const dy = Math.abs(me.getGraphY() - this.first.y);

          if (dx > this.graph.tolerance || dy > this.graph.tolerance) {
            this.shape = this.createShape();

            if (this.edgeState != null) {
              this.shape.apply(this.edgeState);
            }

            // Revalidates current connection
            this.updateCurrentState(me, point);
          }
        }

        // Updates the points in the preview edge
        if (this.shape != null) {
          if (this.edgeState != null) {
            this.shape.points = this.edgeState.absolutePoints;
          } else {
            let pts = [pt2];

            if (this.waypoints != null) {
              pts = pts.concat(this.waypoints);
            }

            pts.push(current);
            this.shape.points = pts;
          }

          this.drawPreview();
        }

        // Makes sure endpoint of edge is visible during connect
        if (this.cursor != null) {
          this.graph.container.style.cursor = this.cursor;
        }

        InternalEvent.consume(me.getEvent());
        me.consume();
      } else if (!this.isEnabled() || !this.graph.isEnabled()) {
        this.constraintHandler.reset();
      } else if (this.previous !== this.currentState && this.edgeState == null) {
        this.destroyIcons();

        // Sets the cursor on the current shape
        if (
          this.currentState != null &&
          this.error == null &&
          this.constraintHandler.currentConstraint == null
        ) {
          this.icons = this.createIcons(this.currentState);

          if (this.icons == null) {
            this.currentState.setCursor(CURSOR_CONNECT);
            me.consume();
          }
        }

        this.previous = this.currentState;
      } else if (
        this.previous === this.currentState &&
        this.currentState != null &&
        this.icons == null &&
        !this.graph.isMouseDown
      ) {
        // Makes sure that no cursors are changed
        me.consume();
      }

      if (!this.graph.isMouseDown && this.currentState != null && this.icons != null) {
        let hitsIcon = false;
        const target = me.getSource();

        for (let i = 0; i < this.icons.length && !hitsIcon; i += 1) {
          hitsIcon =
            target === this.icons[i].node || target.parentNode === this.icons[i].node;
        }

        if (!hitsIcon) {
          this.updateIcons(this.currentState, this.icons, me);
        }
      }
    } else {
      this.constraintHandler.reset();
    }
  }

  /**
   * Function: updateEdgeState
   *
   * Updates <edgeState>.
   */
  updateEdgeState(current: CellState, constraint: CellState): void {
    // TODO: Use generic method for writing constraint to style
    if (this.sourceConstraint != null && this.sourceConstraint.point != null) {
      this.edgeState.style.exitX = this.sourceConstraint.point.x;
      this.edgeState.style.exitY = this.sourceConstraint.point.y;
    }

    if (constraint != null && constraint.point != null) {
      this.edgeState.style.entryX = constraint.point.x;
      this.edgeState.style.entryY = constraint.point.y;
    } else {
      delete this.edgeState.style.entryX;
      delete this.edgeState.style.entryY;
    }

    this.edgeState.absolutePoints = [null, this.currentState != null ? null : current];
    this.graph.view.updateFixedTerminalPoint(
      this.edgeState,
      this.previous,
      true,
      this.sourceConstraint
    );

    if (this.currentState != null) {
      if (constraint == null) {
        constraint = this.graph.getConnectionConstraint(
          this.edgeState,
          this.previous,
          false
        );
      }

      this.edgeState.setAbsoluteTerminalPoint(null, false);
      this.graph.view.updateFixedTerminalPoint(
        this.edgeState,
        this.currentState,
        false,
        constraint
      );
    }

    // Scales and translates the waypoints to the model
    let realPoints = null;

    if (this.waypoints != null) {
      realPoints = [];

      for (let i = 0; i < this.waypoints.length; i += 1) {
        const pt = this.waypoints[i].clone();
        this.convertWaypoint(pt);
        realPoints[i] = pt;
      }
    }

    this.graph.view.updatePoints(
      this.edgeState,
      realPoints,
      this.previous,
      this.currentState
    );
    this.graph.view.updateFloatingTerminalPoints(
      this.edgeState,
      this.previous,
      this.currentState
    );
  }

  /**
   * Function: getTargetPerimeterPoint
   *
   * Returns the perimeter point for the given target state.
   *
   * Parameters:
   *
   * state - <mxCellState> that represents the target cell state.
   * me - <mxMouseEvent> that represents the mouse move.
   */
  getTargetPerimeterPoint(state: CellState, me: MouseEvent): Point {
    let result = null;
    const { view } = state;
    const targetPerimeter = view.getPerimeterFunction(state);

    if (targetPerimeter != null) {
      const next =
        this.waypoints != null && this.waypoints.length > 0
          ? this.waypoints[this.waypoints.length - 1]
          : new Point(this.previous.getCenterX(), this.previous.getCenterY());
      const tmp = targetPerimeter(
        view.getPerimeterBounds(state),
        this.edgeState,
        next,
        false
      );

      if (tmp != null) {
        result = tmp;
      }
    } else {
      result = new Point(state.getCenterX(), state.getCenterY());
    }

    return result;
  }

  /**
   * Function: getSourcePerimeterPoint
   *
   * Hook to update the icon position(s) based on a mouseOver event. This is
   * an empty implementation.
   *
   * Parameters:
   *
   * state - <mxCellState> that represents the target cell state.
   * next - <mxPoint> that represents the next point along the previewed edge.
   * me - <mxMouseEvent> that represents the mouse move.
   */
  getSourcePerimeterPoint(state: CellState, next: Point, me: MouseEvent): Point {
    let result = null;
    const { view } = state;
    const sourcePerimeter = view.getPerimeterFunction(state);
    const c = new Point(state.getCenterX(), state.getCenterY());

    if (sourcePerimeter != null) {
      const theta = getValue(state.style, 'rotation', 0);
      const rad = -theta * (Math.PI / 180);

      if (theta !== 0) {
        next = getRotatedPoint(
          new Point(next.x, next.y),
          Math.cos(rad),
          Math.sin(rad),
          c
        );
      }

      let tmp = sourcePerimeter(view.getPerimeterBounds(state), state, next, false);

      if (tmp != null) {
        if (theta !== 0) {
          tmp = getRotatedPoint(
            new Point(tmp.x, tmp.y),
            Math.cos(-rad),
            Math.sin(-rad),
            c
          );
        }

        result = tmp;
      }
    } else {
      result = c;
    }

    return result;
  }

  /**
   * Function: updateIcons
   *
   * Hook to update the icon position(s) based on a mouseOver event. This is
   * an empty implementation.
   *
   * Parameters:
   *
   * state - <mxCellState> under the mouse.
   * icons - Array of currently displayed icons.
   * me - <mxMouseEvent> that contains the mouse event.
   */
  updateIcons(state: CellState, icons: string[], me: InternalMouseEvent): void {
    // empty
  }

  /**
   * Function: isStopEvent
   *
   * Returns true if the given mouse up event should stop this handler. The
   * connection will be created if <error> is null. Note that this is only
   * called if <waypointsEnabled> is true. This implemtation returns true
   * if there is a cell state in the given event.
   */
  isStopEvent(me: InternalMouseEvent): boolean {
    return me.getState() != null;
  }

  /**
   * Function: addWaypoint
   *
   * Adds the waypoint for the given event to <waypoints>.
   */
  addWaypointForEvent(me: InternalMouseEvent): void {
    let point = convertPoint(this.graph.container, me.getX(), me.getY());
    const dx = Math.abs(point.x - this.first.x);
    const dy = Math.abs(point.y - this.first.y);
    const addPoint =
      this.waypoints != null ||
      (this.mouseDownCounter > 1 &&
        (dx > this.graph.tolerance || dy > this.graph.tolerance));

    if (addPoint) {
      if (this.waypoints == null) {
        this.waypoints = [];
      }

      const { scale } = this.graph.view;
      point = new point(
        this.graph.snap(me.getGraphX() / scale) * scale,
        this.graph.snap(me.getGraphY() / scale) * scale
      );
      this.waypoints.push(point);
    }
  }

  /**
   * Function: checkConstraints
   *
   * Returns true if the connection for the given constraints is valid. This
   * implementation returns true if the constraints are not pointing to the
   * same fixed connection point.
   */
  checkConstraints(c1, c2) {
    return (
      c1 == null ||
      c2 == null ||
      c1.point == null ||
      c2.point == null ||
      !c1.point.equals(c2.point) ||
      c1.dx !== c2.dx ||
      c1.dy !== c2.dy ||
      c1.perimeter !== c2.perimeter
    );
  }

  /**
   * Function: mouseUp
   *
   * Handles the event by inserting the new connection.
   */
  mouseUp(sender: InternalMouseEvent, me: InternalMouseEvent): void {
    if (!me.isConsumed() && this.isConnecting()) {
      if (this.waypointsEnabled && !this.isStopEvent(me)) {
        this.addWaypointForEvent(me);
        me.consume();

        return;
      }

      const c1 = this.sourceConstraint;
      const c2 = this.constraintHandler.currentConstraint;

      const source = this.previous != null ? this.previous.cell : null;
      let target = null;

      if (
        this.constraintHandler.currentConstraint != null &&
        this.constraintHandler.currentFocus != null
      ) {
        target = this.constraintHandler.currentFocus.cell;
      }

      if (target == null && this.currentState != null) {
        target = this.currentState.cell;
      }

      // Inserts the edge if no validation error exists and if constraints differ
      if (
        this.error == null &&
        (source == null ||
          target == null ||
          source !== target ||
          this.checkConstraints(c1, c2))
      ) {
        this.connect(source, target, me.getEvent(), me.getCell());
      } else {
        // Selects the source terminal for self-references
        if (
          this.previous != null &&
          this.marker.validState != null &&
          this.previous.cell === this.marker.validState.cell
        ) {
          this.graph.selectCellForEvent(this.marker.source, me.getEvent());
        }

        // Displays the error message if it is not an empty string,
        // for empty error messages, the event is silently dropped
        if (this.error != null && this.error.length > 0) {
          this.graph.validationAlert(this.error);
        }
      }

      // Redraws the connect icons and resets the handler state
      this.destroyIcons();
      me.consume();
    }

    if (this.first != null) {
      this.reset();
    }
  }

  /**
   * Function: reset
   *
   * Resets the state of this handler.
   */
  reset(): void {
    if (this.shape != null) {
      this.shape.destroy();
      this.shape = null;
    }

    // Resets the cursor on the container
    if (this.cursor != null && this.graph.container != null) {
      this.graph.container.style.cursor = '';
    }

    this.destroyIcons();
    this.marker.reset();
    this.constraintHandler.reset();
    this.originalPoint = null;
    this.currentPoint = null;
    this.edgeState = null;
    this.previous = null;
    this.error = null;
    this.sourceConstraint = null;
    this.mouseDownCounter = 0;
    this.first = null;

    this.fireEvent(new EventObject(InternalEvent.RESET));
  }

  /**
   * Function: drawPreview
   *
   * Redraws the preview edge using the color and width returned by
   * <getEdgeColor> and <getEdgeWidth>.
   */
  drawPreview(): void {
    this.updatePreview(this.error == null);
    this.shape.redraw();
  }

  /**
   * Function: getEdgeColor
   *
   * Returns the color used to draw the preview edge. This returns green if
   * there is no edge validation error and red otherwise.
   *
   * Parameters:
   *
   * valid - Boolean indicating if the color for a valid edge should be
   * returned.
   */
  updatePreview(valid: boolean): void {
    this.shape.strokeWidth = this.getEdgeWidth(valid);
    this.shape.stroke = this.getEdgeColor(valid);
  }

  /**
   * Function: getEdgeColor
   *
   * Returns the color used to draw the preview edge. This returns green if
   * there is no edge validation error and red otherwise.
   *
   * Parameters:
   *
   * valid - Boolean indicating if the color for a valid edge should be
   * returned.
   */
  getEdgeColor(valid: boolean): string {
    return valid ? VALID_COLOR : INVALID_COLOR;
  }

  /**
   * Function: getEdgeWidth
   *
   * Returns the width used to draw the preview edge. This returns 3 if
   * there is no edge validation error and 1 otherwise.
   *
   * Parameters:
   *
   * valid - Boolean indicating if the width for a valid edge should be
   * returned.
   */
  getEdgeWidth(valid: boolean): number {
    return valid ? 3 : 1;
  }

  /**
   * Function: connect
   *
   * Connects the given source and target using a new edge. This
   * implementation uses <createEdge> to create the edge.
   *
   * Parameters:
   *
   * source - <mxCell> that represents the source terminal.
   * target - <mxCell> that represents the target terminal.
   * evt - Mousedown event of the connect gesture.
   * dropTarget - <mxCell> that represents the cell under the mouse when it was
   * released.
   */
  connect(source: Cell, target: Cell, evt: MouseEvent, dropTarget: Cell): void {
    if (target != null || this.isCreateTarget(evt) || this.graph.allowDanglingEdges) {
      // Uses the common parent of source and target or
      // the default parent to insert the edge
      const model = this.graph.getModel();
      let terminalInserted = false;
      let edge = null;

      model.beginUpdate();
      try {
        if (
          source != null &&
          target == null &&
          !this.graph.isIgnoreTerminalEvent(evt) &&
          this.isCreateTarget(evt)
        ) {
          target = this.createTargetVertex(evt, source);

          if (target != null) {
            dropTarget = this.graph.getDropTarget([target], evt, dropTarget);
            terminalInserted = true;

            // Disables edges as drop targets if the target cell was created
            // FIXME: Should not shift if vertex was aligned (same in Java)
            if (dropTarget == null || !dropTarget.isEdge()) {
              const pstate = this.graph.getView().getState(dropTarget);

              if (pstate != null) {
                const tmp = target.getGeometry();
                tmp.x -= pstate.origin.x;
                tmp.y -= pstate.origin.y;
              }
            } else {
              dropTarget = this.graph.getDefaultParent();
            }

            this.graph.addCell(target, dropTarget);
          }
        }

        let parent = this.graph.getDefaultParent();

        if (
          source != null &&
          target != null &&
          source.getParent() === target.getParent() &&
          source.getParent().getParent() !== model.getRoot()
        ) {
          parent = source.getParent();

          if (
            source.geometry != null &&
            source.geometry.relative &&
            target.geometry != null &&
            target.geometry.relative
          ) {
            parent = parent.getParent();
          }
        }

        // Uses the value of the preview edge state for inserting
        // the new edge into the graph
        let value = null;
        let style = null;

        if (this.edgeState != null) {
          value = this.edgeState.cell.value;
          style = this.edgeState.cell.style;
        }

        edge = this.insertEdge(parent, null, value, source, target, style);

        if (edge != null) {
          // Updates the connection constraints
          this.graph.setConnectionConstraint(edge, source, true, this.sourceConstraint);
          this.graph.setConnectionConstraint(
            edge,
            target,
            false,
            this.constraintHandler.currentConstraint
          );

          // Uses geometry of the preview edge state
          if (this.edgeState != null) {
            model.setGeometry(edge, this.edgeState.cell.geometry);
          }

          parent = source.getParent();

          // Inserts edge before source
          if (this.isInsertBefore(edge, source, target, evt, dropTarget)) {
            const index = null;
            let tmp = source;

            while (
              tmp.parent != null &&
              tmp.geometry != null &&
              tmp.geometry.relative &&
              tmp.parent !== edge.parent
            ) {
              tmp = tmp.getParent();
            }

            if (tmp != null && tmp.parent != null && tmp.parent === edge.parent) {
              model.add(parent, edge, tmp.parent.getIndex(tmp));
            }
          }

          // Makes sure the edge has a non-null, relative geometry
          let geo = edge.getGeometry();

          if (geo == null) {
            geo = new Geometry();
            geo.relative = true;

            model.setGeometry(edge, geo);
          }

          // Uses scaled waypoints in geometry
          if (this.waypoints != null && this.waypoints.length > 0) {
            const s = this.graph.view.scale;
            const tr = this.graph.view.translate;
            geo.points = [];

            for (let i = 0; i < this.waypoints.length; i += 1) {
              const pt = this.waypoints[i];
              geo.points.push(new Point(pt.x / s - tr.x, pt.y / s - tr.y));
            }
          }

          if (target == null) {
            const t = this.graph.view.translate;
            const s = this.graph.view.scale;
            const pt =
              this.originalPoint != null
                ? new Point(
                    this.originalPoint.x / s - t.x,
                    this.originalPoint.y / s - t.y
                  )
                : new Point(this.currentPoint.x / s - t.x, this.currentPoint.y / s - t.y);
            pt.x -= this.graph.panDx / this.graph.view.scale;
            pt.y -= this.graph.panDy / this.graph.view.scale;
            geo.setTerminalPoint(pt, false);
          }

          this.fireEvent(
            new EventObject(
              InternalEvent.CONNECT,
              'cell',
              edge,
              'terminal',
              target,
              'event',
              evt,
              'target',
              dropTarget,
              'terminalInserted',
              terminalInserted
            )
          );
        }
      } catch (e) {
        mxLog.show();
        mxLog.debug(e.message);
      } finally {
        model.endUpdate();
      }

      if (this.select) {
        this.selectCells(edge, terminalInserted ? target : null);
      }
    }
  }

  /**
   * Function: selectCells
   *
   * Selects the given edge after adding a new connection. The target argument
   * contains the target vertex if one has been inserted.
   */
  selectCells(edge: Cell, target: Cell): void {
    this.graph.setSelectionCell(edge);
  }

  /**
   * Function: insertEdge
   *
   * Creates, inserts and returns the new edge for the given parameters. This
   * implementation does only use <createEdge> if <factoryMethod> is defined,
   * otherwise <mxGraph.insertEdge> will be used.
   */
  insertEdge(
    parent: Cell,
    id: string,
    value: any,
    source: Cell,
    target: Cell,
    style: string
  ): Cell {
    if (this.factoryMethod == null) {
      return this.graph.insertEdge(parent, id, value, source, target, style);
    }
    let edge = this.createEdge(value, source, target, style);
    edge = this.graph.addEdge(edge, parent, source, target);

    return edge;
  }

  /**
   * Function: createTargetVertex
   *
   * Hook method for creating new vertices on the fly if no target was
   * under the mouse. This is only called if <createTarget> is true and
   * returns null.
   *
   * Parameters:
   *
   * evt - Mousedown event of the connect gesture.
   * source - <mxCell> that represents the source terminal.
   */
  createTargetVertex(evt: MouseEvent, source: Cell): Cell {
    // Uses the first non-relative source
    let geo = source.getGeometry();

    while (geo != null && geo.relative) {
      source = source.getParent();
      geo = source.getGeometry();
    }

    const clone = this.graph.cloneCell(source);
    geo = clone.getGeometry();

    if (geo != null) {
      const t = this.graph.view.translate;
      const s = this.graph.view.scale;
      const point = new Point(
        this.currentPoint.x / s - t.x,
        this.currentPoint.y / s - t.y
      );
      geo.x = Math.round(point.x - geo.width / 2 - this.graph.panDx / s);
      geo.y = Math.round(point.y - geo.height / 2 - this.graph.panDy / s);

      // Aligns with source if within certain tolerance
      const tol = this.getAlignmentTolerance();

      if (tol > 0) {
        const sourceState = this.graph.view.getState(source);

        if (sourceState != null) {
          const x = sourceState.x / s - t.x;
          const y = sourceState.y / s - t.y;

          if (Math.abs(x - geo.x) <= tol) {
            geo.x = Math.round(x);
          }

          if (Math.abs(y - geo.y) <= tol) {
            geo.y = Math.round(y);
          }
        }
      }
    }

    return clone;
  }

  /**
   * Function: getAlignmentTolerance
   *
   * Returns the tolerance for aligning new targets to sources. This returns the grid size / 2.
   */
  getAlignmentTolerance(evt: MouseEvent): number {
    return this.graph.grid.isGridEnabled()
      ? this.graph.grid.gridSize / 2
      : this.graph.grid.tolerance;
  }

  /**
   * Function: createEdge
   *
   * Creates and returns a new edge using <factoryMethod> if one exists. If
   * no factory method is defined, then a new default edge is returned. The
   * source and target arguments are informal, the actual connection is
   * setup later by the caller of this function.
   *
   * Parameters:
   *
   * value - Value to be used for creating the edge.
   * source - <mxCell> that represents the source terminal.
   * target - <mxCell> that represents the target terminal.
   * style - Optional style from the preview edge.
   */
  createEdge(value?: any, source?: Cell, target?: Cell, style?: string): Cell {
    let edge = null;

    // Creates a new edge using the factoryMethod
    if (this.factoryMethod != null) {
      edge = this.factoryMethod(source, target, style);
    }

    if (edge == null) {
      edge = new Cell(value || '');
      edge.setEdge(true);
      edge.setStyle(style);

      const geo = new Geometry();
      geo.relative = true;
      edge.setGeometry(geo);
    }

    return edge;
  }

  /**
   * Function: destroy
   *
   * Destroys the handler and all its resources and DOM nodes. This should be
   * called on all instances. It is called automatically for the built-in
   * instance created for each <mxGraph>.
   */
  destroy(): void {
    this.graph.removeMouseListener(this);

    if (this.shape != null) {
      this.shape.destroy();
      this.shape = null;
    }

    if (this.marker != null) {
      this.marker.destroy();
      this.marker = null;
    }

    if (this.constraintHandler != null) {
      this.constraintHandler.destroy();
      this.constraintHandler = null;
    }

    if (this.changeHandler != null) {
      this.graph.getModel().removeListener(this.changeHandler);
      this.graph.getView().removeListener(this.changeHandler);
      this.changeHandler = null;
    }

    if (this.drillHandler != null) {
      this.graph.removeListener(this.drillHandler);
      this.graph.getView().removeListener(this.drillHandler);
      this.drillHandler = null;
    }

    if (this.escapeHandler != null) {
      this.graph.removeListener(this.escapeHandler);
      this.escapeHandler = null;
    }
  }
}

export default ConnectionHandler;
