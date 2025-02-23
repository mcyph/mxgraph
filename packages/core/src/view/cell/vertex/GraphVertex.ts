import Cell from "../datatypes/Cell";
import Geometry from "../../geometry/Geometry";
import CellArray from "../datatypes/CellArray";
import Graph from '../../Graph';

class GraphVertex {
  constructor(graph: Graph) {
    this.graph = graph;
  }

  graph: Graph;

  /**
   * Specifies the return value for vertices in {@link isLabelMovable}.
   * @default false
   */
  vertexLabelsMovable: boolean = false;

  /**
   * Specifies if negative coordinates for vertices are allowed.
   * @default true
   */
  allowNegativeCoordinates: boolean = true;

  /**
   * Function: insertVertex
   *
   * Adds a new vertex into the given parent <mxCell> using value as the user
   * object and the given coordinates as the <mxGeometry> of the new vertex.
   * The id and style are used for the respective properties of the new
   * <mxCell>, which is returned.
   *
   * When adding new vertices from a mouse event, one should take into
   * account the offset of the graph container and the scale and translation
   * of the view in order to find the correct unscaled, untranslated
   * coordinates using <mxGraph.getPointForEvent> as follows:
   *
   * (code)
   * let pt = graph.getPointForEvent(evt);
   * let parent = graph.getDefaultParent();
   * graph.insertVertex(parent, null,
   *       'Hello, World!', x, y, 220, 30);
   * (end)
   *
   * For adding image cells, the style parameter can be assigned as
   *
   * (code)
   * stylename;image=imageUrl
   * (end)
   *
   * See <mxGraph> for more information on using images.
   *
   * Parameters:
   *
   * parent - <mxCell> that specifies the parent of the new vertex.
   * id - Optional string that defines the Id of the new vertex.
   * value - Object to be used as the user object.
   * x - Integer that defines the x coordinate of the vertex.
   * y - Integer that defines the y coordinate of the vertex.
   * width - Integer that defines the width of the vertex.
   * height - Integer that defines the height of the vertex.
   * style - Optional string that defines the cell style.
   * relative - Optional boolean that specifies if the geometry is relative.
   * Default is false.
   * geometryClass - Optional class reference to a class derived from mxGeometry.
   *                 This can be useful for defining custom constraints.
   */
  insertVertex = (...args: any[]): Cell => {
    let parent;
    let id;
    let value;
    let x;
    let y;
    let width;
    let height;
    let style;
    let relative;
    let geometryClass;

    if (args.length === 1) {
      // If only a single parameter, treat as an object
      // This syntax can be more readable
      const params = args[0];
      parent = params.parent;
      id = params.id;
      value = params.value;

      x = 'x' in params ? params.x : params.position[0];
      y = 'y' in params ? params.y : params.position[1];
      width = 'width' in params ? params.width : params.size[0];
      height = 'height' in params ? params.height : params.size[1];

      style = params.style;
      relative = params.relative;
      geometryClass = params.geometryClass;
    } else {
      // Otherwise treat as arguments
      [
        parent,
        id,
        value,
        x,
        y,
        width,
        height,
        style,
        relative,
        geometryClass,
      ] = args;
    }

    const vertex = this.createVertex(
      parent,
      id,
      value,
      x,
      y,
      width,
      height,
      style,
      relative,
      geometryClass
    );
    return this.graph.cell.addCell(vertex, parent);
  };

  /**
   * Function: createVertex
   *
   * Hook method that creates the new vertex for <insertVertex>.
   */
  createVertex(
    parent: Cell,
    id: string,
    value: any,
    x: number,
    y: number,
    width: number,
    height: number,
    style: any,
    relative: boolean = false,
    geometryClass: typeof Geometry = Geometry
  ) {
    // Creates the geometry for the vertex
    const geometry = new geometryClass(x, y, width, height);
    geometry.relative = relative != null ? relative : false;

    // Creates the vertex
    const vertex = new Cell(value, geometry, style);
    vertex.setId(id);
    vertex.setVertex(true);
    vertex.setConnectable(true);

    return vertex;
  }

  /**
   * Returns the visible child vertices of the given parent.
   *
   * @param parent {@link mxCell} whose children should be returned.
   */
  getChildVertices(parent: Cell): CellArray {
    return this.graph.cell.getChildCells(parent, true, false);
  }

  /*****************************************************************************
   * Group: Graph Behaviour
   *****************************************************************************/

  /**
   * Returns {@link vertexLabelsMovable}.
   */
  isVertexLabelsMovable(): boolean {
    return this.vertexLabelsMovable;
  }

  /**
   * Sets {@link vertexLabelsMovable}.
   */
  setVertexLabelsMovable(value: boolean): void {
    this.vertexLabelsMovable = value;
  }
}

export default GraphVertex;
