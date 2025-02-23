import Cell from "../cell/datatypes/Cell";
import Resources from "../../util/Resources";
import {isNode} from "../../util/DomUtils";
import CellState from "../cell/datatypes/CellState";
import Multiplicity from "./Multiplicity";
import Graph from "../Graph";

class GraphValidation {
  constructor(graph: Graph) {
    this.graph = graph;

    this.multiplicities = [];
  }

  graph: Graph;

  /**
   * An array of {@link Multiplicity} describing the allowed
   * connections in a graph.
   */
  multiplicities: Multiplicity[] | null = null;

  /*****************************************************************************
   * Group: Validation
   *****************************************************************************/

  /**
   * Displays the given validation error in a dialog. This implementation uses
   * mxUtils.alert.
   */
  validationAlert(message: any): void {
    alert(message);
  }

  /**
   * Checks if the return value of {@link getEdgeValidationError} for the given
   * arguments is null.
   *
   * @param edge {@link mxCell} that represents the edge to validate.
   * @param source {@link mxCell} that represents the source terminal.
   * @param target {@link mxCell} that represents the target terminal.
   */
  isEdgeValid(edge: Cell, source: Cell, target: Cell): boolean {
    return this.getEdgeValidationError(edge, source, target) == null;
  }

  /**
   * Returns the validation error message to be displayed when inserting or
   * changing an edges' connectivity. A return value of null means the edge
   * is valid, a return value of '' means it's not valid, but do not display
   * an error message. Any other (non-empty) string returned from this method
   * is displayed as an error message when trying to connect an edge to a
   * source and target. This implementation uses the {@link multiplicities}, and
   * checks {@link multigraph}, {@link allowDanglingEdges} and {@link allowLoops} to generate
   * validation errors.
   *
   * For extending this method with specific checks for source/target cells,
   * the method can be extended as follows. Returning an empty string means
   * the edge is invalid with no error message, a non-null string specifies
   * the error message, and null means the edge is valid.
   *
   * ```javascript
   * graph.getEdgeValidationError = function(edge, source, target)
   * {
   *   if (source != null && target != null &&
   *     this.model.getValue(source) != null &&
   *     this.model.getValue(target) != null)
   *   {
   *     if (target is not valid for source)
   *     {
   *       return 'Invalid Target';
   *     }
   *   }
   *
   *   // "Supercall"
   *   return getEdgeValidationError.apply(this, arguments);
   * }
   * ```
   *
   * @param edge {@link mxCell} that represents the edge to validate.
   * @param source {@link mxCell} that represents the source terminal.
   * @param target {@link mxCell} that represents the target terminal.
   */
  getEdgeValidationError(
    edge: Cell | null = null,
    source: Cell | null = null,
    target: Cell | null = null
  ): string | null {
    if (
      edge != null &&
      !this.isAllowDanglingEdges() &&
      (source == null || target == null)
    ) {
      return '';
    }

    if (
      edge != null &&
      edge.getTerminal(true) == null &&
      edge.getTerminal(false) == null
    ) {
      return null;
    }

    // Checks if we're dealing with a loop
    if (!this.allowLoops && source === target && source != null) {
      return '';
    }

    // Checks if the connection is generally allowed
    if (!this.isValidConnection(<Cell>source, <Cell>target)) {
      return '';
    }

    if (source != null && target != null) {
      let error = '';

      // Checks if the cells are already connected
      // and adds an error message if required
      if (!this.multigraph) {
        const tmp = this.getModel().getEdgesBetween(source, target, true);

        // Checks if the source and target are not connected by another edge
        if (tmp.length > 1 || (tmp.length === 1 && tmp[0] !== edge)) {
          error += `${
            Resources.get(this.alreadyConnectedResource) ||
            this.alreadyConnectedResource
          }\n`;
        }
      }

      // Gets the number of outgoing edges from the source
      // and the number of incoming edges from the target
      // without counting the edge being currently changed.
      const sourceOut = source.getDirectedEdgeCount(true, edge);
      const targetIn = target.getDirectedEdgeCount(false, edge);

      // Checks the change against each multiplicity rule
      if (this.multiplicities != null) {
        for (const multiplicity of this.multiplicities) {
          const err = multiplicity.check(
            this,
            <Cell>edge,
            source,
            target,
            sourceOut,
            targetIn
          );

          if (err != null) {
            error += err;
          }
        }
      }

      // Validates the source and target terminals independently
      const err = this.validateEdge(<Cell>edge, source, target);
      if (err != null) {
        error += err;
      }
      return error.length > 0 ? error : null;
    }

    return this.allowDanglingEdges ? null : '';
  }

  /**
   * Hook method for subclassers to return an error message for the given
   * edge and terminals. This implementation returns null.
   *
   * @param edge {@link mxCell} that represents the edge to validate.
   * @param source {@link mxCell} that represents the source terminal.
   * @param target {@link mxCell} that represents the target terminal.
   */
  // validateEdge(edge: mxCell, source: mxCell, target: mxCell): string | null;
  validateEdge(edge: Cell, source: Cell, target: Cell): void | null {
    return null;
  }

  /**
   * Validates the graph by validating each descendant of the given cell or
   * the root of the model. Context is an object that contains the validation
   * state for the complete validation run. The validation errors are
   * attached to their cells using {@link setCellWarning}. Returns null in the case of
   * successful validation or an array of strings (warnings) in the case of
   * failed validations.
   *
   * Paramters:
   *
   * @param cell Optional {@link Cell} to start the validation recursion. Default is
   * the graph root.
   * @param context Object that represents the global validation state.
   */
  validateGraph(
    cell: Cell = <Cell>this.graph.model.getRoot(),
    context: any
  ): string | null {
    context = context != null ? context : {};

    let isValid = true;
    const childCount = cell.getChildCount();

    for (let i = 0; i < childCount; i += 1) {
      const tmp = <Cell>cell.getChildAt(i);
      let ctx = context;

      if (this.isValidRoot(tmp)) {
        ctx = {};
      }

      const warn = this.validateGraph(tmp, ctx);

      if (warn != null) {
        this.setCellWarning(tmp, warn.replace(/\n/g, '<br>'));
      } else {
        this.setCellWarning(tmp, null);
      }

      isValid = isValid && warn == null;
    }

    let warning = '';

    // Adds error for invalid children if collapsed (children invisible)
    if (cell && cell.isCollapsed() && !isValid) {
      warning += `${
        Resources.get(this.containsValidationErrorsResource) ||
        this.containsValidationErrorsResource
      }\n`;
    }

    // Checks edges and cells using the defined multiplicities
    if (cell && cell.isEdge()) {
      warning +=
        this.getEdgeValidationError(
          cell,
          cell.getTerminal(true),
          cell.getTerminal(false)
        ) || '';
    } else {
      warning += this.getCellValidationError(<Cell>cell) || '';
    }

    // Checks custom validation rules
    const err = this.validateCell(<Cell>cell, context);

    if (err != null) {
      warning += err;
    }

    // Updates the display with the warning icons
    // before any potential alerts are displayed.
    // LATER: Move this into addCellOverlay. Redraw
    // should check if overlay was added or removed.
    if (cell.getParent() == null) {
      this.getView().validate();
    }
    return warning.length > 0 || !isValid ? warning : null;
  }

  /**
   * Checks all {@link multiplicities} that cannot be enforced while the graph is
   * being modified, namely, all multiplicities that require a minimum of
   * 1 edge.
   *
   * @param cell {@link mxCell} for which the multiplicities should be checked.
   */
  getCellValidationError(cell: Cell): string | null {
    const outCount = cell.getDirectedEdgeCount(true);
    const inCount = cell.getDirectedEdgeCount(false);
    const value = cell.getValue();
    let error = '';

    if (this.multiplicities != null) {
      for (let i = 0; i < this.multiplicities.length; i += 1) {
        const rule = this.multiplicities[i];

        if (
          rule.source &&
          isNode(value, rule.type, rule.attr, rule.value) &&
          (outCount > rule.max || outCount < rule.min)
        ) {
          error += `${rule.countError}\n`;
        } else if (
          !rule.source &&
          isNode(value, rule.type, rule.attr, rule.value) &&
          (inCount > rule.max || inCount < rule.min)
        ) {
          error += `${rule.countError}\n`;
        }
      }
    }
    return error.length > 0 ? error : null;
  }

  /**
   * Hook method for subclassers to return an error message for the given
   * cell and validation context. This implementation returns null. Any HTML
   * breaks will be converted to linefeeds in the calling method.
   *
   * @param cell {@link mxCell} that represents the cell to validate.
   * @param context Object that represents the global validation state.
   */
  // validateCell(cell: mxCell, context: any): string | null;
  validateCell(cell: Cell, context: CellState): void | null {
    return null;
  }
}

export default GraphValidation;
