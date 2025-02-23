/**
 * Copyright (c) 2006-2015, JGraph Ltd
 * Copyright (c) 2006-2015, Gaudenz Alder
 * Updated to ES9 syntax by David Morrissey 2021
 * Type definitions from the typed-mxgraph project
 */

import { getAlignmentAsPoint, getStringValue, getValue, setPrefixedStyle } from '../../util/Utils';
import Rectangle from '../geometry/Rectangle';
import InternalEvent from '../event/InternalEvent';
import mxClient from '../../mxClient';
import {
  ABSOLUTE_LINE_HEIGHT,
  ALIGN_CENTER,
  ALIGN_LEFT,
  ALIGN_MIDDLE,
  DEFAULT_FONTFAMILY,
  DEFAULT_FONTSIZE,
  DEFAULT_TEXT_DIRECTION,
  DIALECT_STRICTHTML,
  FONT_BOLD,
  FONT_ITALIC,
  FONT_STRIKETHROUGH,
  FONT_UNDERLINE,
  LINE_HEIGHT,
  WORD_WRAP,
} from '../../util/Constants';
import TextShape from '../geometry/shape/node/TextShape';
import graph from '../Graph';
import Cell from '../cell/datatypes/Cell';
import InternalMouseEvent from '../event/InternalMouseEvent';
import CellState from '../cell/datatypes/CellState';
import Shape from '../geometry/shape/Shape';
import EventObject from '../event/EventObject';
import { extractTextWithWhitespace, isNode } from '../../util/DomUtils';
import {
  htmlEntities,
  replaceTrailingNewlines,
} from '../../util/StringUtils';
import {
  getSource,
  isConsumed,
  isControlDown,
  isMetaDown,
  isShiftDown,
} from '../../util/EventUtils';

/**
 * Class: mxCellEditor
 *
 * In-place editor for the graph. To control this editor, use
 * <mxGraph.invokesStopCellEditing>, <mxGraph.enterStopsCellEditing> and
 * <mxGraph.escapeEnabled>. If <mxGraph.enterStopsCellEditing> is true then
 * ctrl-enter or shift-enter can be used to create a linefeed. The F2 and
 * escape keys can always be used to stop editing.
 *
 * To customize the location of the textbox in the graph, override
 * <getEditorBounds> as follows:
 *
 * (code)
 * graph.cellEditor.getEditorBounds = (state)=>
 * {
 *   let result = getEditorBounds.apply(this, arguments);
 *
 *   if (this.graph.getModel().isEdge(state.cell))
 *   {
 *     result.x = state.getCenterX() - result.width / 2;
 *     result.y = state.getCenterY() - result.height / 2;
 *   }
 *
 *   return result;
 * };
 * (end)
 *
 * Note that this hook is only called if <autoSize> is false. If <autoSize> is true,
 * then <mxShape.getLabelBounds> is used to compute the current bounds of the textbox.
 *
 * The textarea uses the mxCellEditor CSS class. You can modify this class in
 * your custom CSS. Note: You should modify the CSS after loading the client
 * in the page.
 *
 * Example:
 *
 * To only allow numeric input in the in-place editor, use the following code.
 *
 * (code)
 * let text = graph.cellEditor.textarea;
 *
 * mxEvent.addListener(text, 'keydown', function (evt)
 * {
 *   if (!(evt.keyCode >= 48 && evt.keyCode <= 57) &&
 *       !(evt.keyCode >= 96 && evt.keyCode <= 105))
 *   {
 *     mxEvent.consume(evt);
 *   }
 * });
 * (end)
 *
 * Placeholder:
 *
 * To implement a placeholder for cells without a label, use the
 * <emptyLabelText> variable.
 *
 * Resize in Chrome:
 *
 * Resize of the textarea is disabled by default. If you want to enable
 * this feature extend <init> and set this.textarea.style.resize = ''.
 *
 * To start editing on a key press event, the container of the graph
 * should have focus or a focusable parent should be used to add the
 * key press handler as follows.
 *
 * (code)
 * mxEvent.addListener(graph.container, 'keypress', mxUtils.bind(this, (evt)=>
 * {
 *   if (!graph.isEditing() && !graph.isSelectionEmpty() && evt.which !== 0 &&
 *       !mxEvent.isAltDown(evt) && !mxEvent.isControlDown(evt) && !mxEvent.isMetaDown(evt))
 *   {
 *     graph.startEditing();
 *
 *     if (mxClient.IS_FF)
 *     {
 *       graph.cellEditor.textarea.value = String.fromCharCode(evt.which);
 *     }
 *   }
 * }));
 * (end)
 *
 * To allow focus for a DIV, and hence to receive key press events, some browsers
 * require it to have a valid tabindex attribute. In this case the following
 * code may be used to keep the container focused.
 *
 * (code)
 * let graphFireMouseEvent = graph.fireMouseEvent;
 * graph.fireMouseEvent = (evtName, me, sender)=>
 * {
 *   if (evtName == mxEvent.MOUSE_DOWN)
 *   {
 *     this.container.focus();
 *   }
 *
 *   graphFireMouseEvent.apply(this, arguments);
 * };
 * (end)
 *
 * Constructor: mxCellEditor
 *
 * Constructs a new in-place editor for the specified graph.
 *
 * Parameters:
 *
 * graph - Reference to the enclosing <mxGraph>.
 */
class CellEditor {
  constructor(graph: graph) {
    this.graph = graph;

    // Stops editing after zoom changes
    this.zoomHandler = () => {
      if (this.graph.isEditing()) {
        this.resize();
      }
    };

    // Handling of deleted cells while editing
    this.changeHandler = (sender: any) => {
      if (
        this.editingCell != null &&
        this.graph.getView().getState(this.editingCell, false) == null
      ) {
        this.stopEditing(true);
      }
    };

    this.graph.view.addListener(InternalEvent.SCALE, this.zoomHandler);
    this.graph.view.addListener(InternalEvent.SCALE_AND_TRANSLATE, this.zoomHandler);
    this.graph.getModel().addListener(InternalEvent.CHANGE, this.changeHandler);
  }

  // TODO: Document me!
  changeHandler: Function | null;

  zoomHandler: Function | null;

  clearOnChange: boolean = false;

  bounds: Rectangle | null = null;

  resizeThread: number | null = null;

  textDirection: '' | 'auto' | 'ltr' | 'rtl' | null = null;

  /**
   * Variable: graph
   *
   * Reference to the enclosing <mxGraph>.
   */
  // graph: mxGraph;
  graph: graph;

  /**
   * Variable: textarea
   *
   * Holds the DIV that is used for text editing. Note that this may be null before the first
   * edit. Instantiated in <init>.
   */
  // textarea: Element;
  textarea: HTMLElement | null = null;

  /**
   * Variable: editingCell
   *
   * Reference to the <mxCell> that is currently being edited.
   */
  // editingCell: mxCell;
  editingCell: Cell | null = null;

  /**
   * Variable: trigger
   *
   * Reference to the event that was used to start editing.
   */
  // trigger: MouseEvent;
  trigger: InternalMouseEvent | MouseEvent | null = null;

  /**
   * Variable: modified
   *
   * Specifies if the label has been modified.
   */
  // modified: boolean;
  modified: boolean = false;

  /**
   * Variable: autoSize
   *
   * Specifies if the textarea should be resized while the text is being edited.
   * Default is true.
   */
  // autoSize: boolean;
  autoSize: boolean = true;

  /**
   * Variable: selectText
   *
   * Specifies if the text should be selected when editing starts. Default is
   * true.
   */
  // selectText: boolean;
  selectText: boolean = true;

  /**
   * Variable: emptyLabelText
   *
   * Text to be displayed for empty labels. Default is '' or '<br>' in Firefox as
   * a workaround for the missing cursor bug for empty content editable. This can
   * be set to eg. "[Type Here]" to easier visualize editing of empty labels. The
   * value is only displayed before the first keystroke and is never used as the
   * actual editing value.
   */
  // emptyLabelText: '<br>' | '';
  emptyLabelText: string = mxClient.IS_FF ? '<br>' : '';

  /**
   * Variable: escapeCancelsEditing
   *
   * If true, pressing the escape key will stop editing and not accept the new
   * value. Change this to false to accept the new value on escape, and cancel
   * editing on Shift+Escape instead. Default is true.
   */
  // escapeCancelsEditing: boolean;
  escapeCancelsEditing: boolean = true;

  /**
   * Variable: textNode
   *
   * Reference to the label DOM node that has been hidden.
   */
  // textNode: string;
  textNode: SVGGElement | null = null;

  /**
   * Variable: zIndex
   *
   * Specifies the zIndex for the textarea. Default is 5.
   */
  // zIndex: number;
  zIndex: number = 5;

  /**
   * Variable: minResize
   *
   * Defines the minimum width and height to be used in <resize>. Default is 0x20px.
   */
  // minResize: mxRectangle;
  minResize: Rectangle = new Rectangle(0, 20);

  /**
   * Variable: wordWrapPadding
   *
   * Correction factor for word wrapping width. Default is 2 in quirks, 0 in IE
   * 11 and 1 in all other browsers and modes.
   */
  // wordWrapPadding: 2 | 1 | 0;
  wordWrapPadding: number = 0;

  /**
   * Variable: blurEnabled
   *
   * If <focusLost> should be called if <textarea> loses the focus. Default is false.
   */
  // blurEnabled: boolean;
  blurEnabled: boolean = false;

  /**
   * Variable: initialValue
   *
   * Holds the initial editing value to check if the current value was modified.
   */
  // initialValue: string;
  initialValue: string | null = null;

  /**
   * Variable: align
   *
   * Holds the current temporary horizontal alignment for the cell style. If this
   * is modified then the current text alignment is changed and the cell style is
   * updated when the value is applied.
   */
  align: string | null = null;

  /**
   * Function: init
   *
   * Creates the <textarea> and installs the event listeners. The key handler
   * updates the <modified> state.
   */
  // init(): void;
  init(): void {
    this.textarea = document.createElement('div');
    this.textarea.className = 'mxCellEditor mxPlainTextEditor';
    this.textarea.contentEditable = String(true);

    // Workaround for selection outside of DIV if height is 0
    if (mxClient.IS_GC) {
      this.textarea.style.minHeight = '1em';
    }

    this.textarea.style.position = 'relative';
    this.installListeners(this.textarea);
  }

  /**
   * Function: applyValue
   *
   * Called in <stopEditing> if cancel is false to invoke <mxGraph.labelChanged>.
   */
  // applyValue(state: mxCellState, value: string): void;
  applyValue(state: CellState, value: any): void {
    this.graph.labelChanged(state.cell, value, <InternalMouseEvent>this.trigger);
  }

  /**
   * Function: setAlign
   *
   * Sets the temporary horizontal alignment for the current editing session.
   */
  setAlign(align: string): void {
    if (this.textarea != null) {
      this.textarea.style.textAlign = align;
    }

    this.align = align;
    this.resize();
  }

  /**
   * Function: getInitialValue
   *
   * Gets the initial editing value for the given cell.
   */
  // getInitialValue(state: mxCellState, trigger: Event): string;
  getInitialValue(state: CellState, trigger: EventObject | InternalMouseEvent) {
    let result = htmlEntities(
      <string>this.graph.getEditingValue(state.cell, trigger),
      false
    );
    result = replaceTrailingNewlines(result, '<div><br></div>');
    return result.replace(/\n/g, '<br>');
  }

  /**
   * Function: getCurrentValue
   *
   * Returns the current editing value.
   */
  // getCurrentValue(state: mxCellState): string;
  getCurrentValue(state: CellState) {
    // @ts-ignore
    return extractTextWithWhitespace(this.textarea.childNodes);
  }

  /**
   * Function: isCancelEditingKeyEvent
   *
   * Returns true if <escapeCancelsEditing> is true and shift, control and meta
   * are not pressed.
   */
  // isCancelEditingKeyEvent(evt: Event): boolean;
  isCancelEditingKeyEvent(evt: KeyboardEvent) {
    return (
      this.escapeCancelsEditing ||
      isShiftDown(evt) ||
      isControlDown(evt) ||
      isMetaDown(evt)
    );
  }

  /**
   * Function: installListeners
   *
   * Installs listeners for focus, change and standard key event handling.
   */
  // installListeners(elt: Element): void;
  installListeners(elt: HTMLElement) {
    // Applies value if text is dragged
    // LATER: Gesture mouse events ignored for starting move
    InternalEvent.addListener(elt, 'dragstart', (evt: Event) => {
      this.graph.stopEditing(false);
      InternalEvent.consume(evt);
    });

    // Applies value if focus is lost
    InternalEvent.addListener(elt, 'blur', (evt: Event) => {
      if (this.blurEnabled) {
        this.focusLost();
      }
    });

    // Updates modified state and handles placeholder text
    InternalEvent.addListener(elt, 'keydown', (evt: KeyboardEvent) => {
      if (!isConsumed(evt)) {
        if (this.isStopEditingEvent(evt)) {
          this.graph.stopEditing(false);
          InternalEvent.consume(evt);
        } else if (evt.keyCode === 27 /* Escape */) {
          this.graph.stopEditing(this.isCancelEditingKeyEvent(evt));
          InternalEvent.consume(evt);
        }
      }
    });

    // Keypress only fires if printable key was pressed and handles removing the empty placeholder
    const keypressHandler = (evt: KeyboardEvent) => {
      if (this.editingCell != null) {
        // Clears the initial empty label on the first keystroke
        // and workaround for FF which fires keypress for delete and backspace
        if (
          this.clearOnChange &&
          elt.innerHTML === this.getEmptyLabelText() &&
          (!mxClient.IS_FF ||
            (evt.keyCode !== 8 /* Backspace */ &&
              evt.keyCode !== 46)) /* Delete */
        ) {
          this.clearOnChange = false;
          elt.innerHTML = '';
        }
      }
    };

    InternalEvent.addListener(elt, 'keypress', keypressHandler);
    InternalEvent.addListener(elt, 'paste', keypressHandler);

    // Handler for updating the empty label text value after a change
    const keyupHandler = (evt: KeyboardEvent) => {
      if (this.editingCell != null) {
        // Uses an optional text value for sempty labels which is cleared
        // when the first keystroke appears. This makes it easier to see
        // that a label is being edited even if the label is empty.
        // In Safari and FF, an empty text is represented by <BR> which isn't enough to force a valid size
        const textarea = <HTMLElement>this.textarea;

        if (textarea.innerHTML.length === 0 || textarea.innerHTML === '<br>') {
          textarea.innerHTML = this.getEmptyLabelText();
          this.clearOnChange = textarea.innerHTML.length > 0;
        } else {
          this.clearOnChange = false;
        }
      }
    };

    InternalEvent.addListener(elt, 'input', keyupHandler);
    InternalEvent.addListener(elt, 'cut', keyupHandler);
    InternalEvent.addListener(elt, 'paste', keyupHandler);

    // Adds automatic resizing of the textbox while typing using input, keyup and/or DOM change events
    const evtName = 'input';

    const resizeHandler = (evt: Event) => {
      if (this.editingCell != null && this.autoSize && !isConsumed(evt)) {
        // Asynchronous is needed for keydown and shows better results for input events overall
        // (ie non-blocking and cases where the offsetWidth/-Height was wrong at this time)
        if (this.resizeThread != null) {
          window.clearTimeout(this.resizeThread);
        }

        this.resizeThread = window.setTimeout(() => {
          this.resizeThread = null;
          this.resize();
        }, 0);
      }
    };

    InternalEvent.addListener(elt, evtName, resizeHandler);
    InternalEvent.addListener(window, 'resize', resizeHandler);
    InternalEvent.addListener(elt, 'cut', resizeHandler);
    InternalEvent.addListener(elt, 'paste', resizeHandler);
  }

  /**
   * Function: isStopEditingEvent
   *
   * Returns true if the given keydown event should stop cell editing. This
   * returns true if F2 is pressed of if <mxGraph.enterStopsCellEditing> is true
   * and enter is pressed without control or shift.
   */
  // isStopEditingEvent(evt: Event): boolean;
  isStopEditingEvent(evt: KeyboardEvent) {
    return (
      evt.keyCode === 113 /* F2 */ ||
      (this.graph.isEnterStopsCellEditing() &&
        evt.keyCode === 13 /* Enter */ &&
        !isControlDown(evt) &&
        !isShiftDown(evt))
    );
  }

  /**
   * Function: isEventSource
   *
   * Returns true if this editor is the source for the given native event.
   */
  isEventSource(evt: Event): boolean {
    return getSource(evt) === this.textarea;
  }

  /**
   * Function: resize
   *
   * Returns <modified>.
   */
  resize(): void {
    const state = this.graph.getView().getState(this.editingCell);

    if (state == null) {
      this.stopEditing(true);
    } else if (this.textarea != null) {
      const isEdge = state.cell.isEdge();
      const { scale } = this.graph.getView();
      let m = null;

      if (!this.autoSize || state.style.overflow === 'fill') {
        // Specifies the bounds of the editor box
        this.bounds = <Rectangle>this.getEditorBounds(state);
        this.textarea.style.width = `${Math.round(
          this.bounds.width / scale
        )}px`;
        this.textarea.style.height = `${Math.round(
          this.bounds.height / scale
        )}px`;

        // FIXME: Offset when scaled
        this.textarea.style.left = `${Math.max(
          0,
          Math.round(this.bounds.x + 1)
        )}px`;
        this.textarea.style.top = `${Math.max(
          0,
          Math.round(this.bounds.y + 1)
        )}px`;

        // Installs native word wrapping and avoids word wrap for empty label placeholder
        if (
          this.graph.isWrapping(state.cell) &&
          (this.bounds.width >= 2 || this.bounds.height >= 2) &&
          this.textarea.innerHTML !== this.getEmptyLabelText()
        ) {
          this.textarea.style.wordWrap = WORD_WRAP;
          this.textarea.style.whiteSpace = 'normal';

          if (state.style.overflow !== 'fill') {
            this.textarea.style.width = `${
              Math.round(this.bounds.width / scale) + this.wordWrapPadding
            }px`;
          }
        } else {
          this.textarea.style.whiteSpace = 'nowrap';

          if (state.style.overflow !== 'fill') {
            this.textarea.style.width = '';
          }
        }
      } else {
        const lw = getValue(state.style, 'labelWidth', null);
        m = state.text != null && this.align == null ? state.text.margin : null;

        if (m == null) {
          m = getAlignmentAsPoint(
            this.align ||
              getValue(state.style, 'align', ALIGN_CENTER),
            getValue(state.style, 'verticalAlign', ALIGN_MIDDLE)
          );
        }

        if (isEdge) {
          this.bounds = new Rectangle(
            state.absoluteOffset.x,
            state.absoluteOffset.y,
            0,
            0
          );

          if (lw != null) {
            const tmp = (parseFloat(lw) + 2) * scale;
            this.bounds.width = tmp;
            this.bounds.x += m.x * tmp;
          }
        } else {
          let bounds = Rectangle.fromRectangle(state);
          let hpos = getValue(
            state.style,
            'labelPosition',
            ALIGN_CENTER
          );
          let vpos = getValue(
            state.style,
            'verticalLabelPosition',
            ALIGN_MIDDLE
          );

          bounds =
            state.shape != null && hpos === 'center' && vpos === 'middle'
              ? state.shape.getLabelBounds(bounds)
              : bounds;

          if (lw != null) {
            bounds.width = parseFloat(lw) * scale;
          }

          if (
            !state.view.graph.cellRenderer.legacySpacing ||
            state.style.overflow !== 'width'
          ) {
            // @ts-ignore
            const dummy = new TextShape(); // FIXME!!!! ===================================================================================================
            const spacing = parseInt(state.style.spacing || 2) * scale;
            const spacingTop =
              (parseInt(state.style.spacingTop || 0) + dummy.baseSpacingTop) *
                scale +
              spacing;
            const spacingRight =
              (parseInt(state.style.spacingRight || 0) +
                dummy.baseSpacingRight) *
                scale +
              spacing;
            const spacingBottom =
              (parseInt(state.style.spacingBottom || 0) +
                dummy.baseSpacingBottom) *
                scale +
              spacing;
            const spacingLeft =
              (parseInt(state.style.spacingLeft || 0) + dummy.baseSpacingLeft) *
                scale +
              spacing;

            hpos =
              state.style.labelPosition != null
                ? state.style.labelPosition
                : 'center';
            vpos =
              state.style.verticalLabelPosition != null
                ? state.style.verticalLabelPosition
                : 'middle';

            bounds = new Rectangle(
              bounds.x + spacingLeft,
              bounds.y + spacingTop,
              bounds.width -
                (hpos === ALIGN_CENTER && lw == null
                  ? spacingLeft + spacingRight
                  : 0),
              bounds.height -
                (vpos === ALIGN_MIDDLE ? spacingTop + spacingBottom : 0)
            );
          }

          this.bounds = new Rectangle(
            bounds.x + state.absoluteOffset.x,
            bounds.y + state.absoluteOffset.y,
            bounds.width,
            bounds.height
          );
        }

        // Needed for word wrap inside text blocks with oversize lines to match the final result where
        // the width of the longest line is used as the reference for text alignment in the cell
        // TODO: Fix word wrapping preview for edge labels in helloworld.html
        if (
          this.graph.isWrapping(state.cell) &&
          (this.bounds.width >= 2 || this.bounds.height >= 2) &&
          this.textarea.innerHTML !== this.getEmptyLabelText()
        ) {
          this.textarea.style.wordWrap = WORD_WRAP;
          this.textarea.style.whiteSpace = 'normal';

          // Forces automatic reflow if text is removed from an oversize label and normal word wrap
          const tmp =
            Math.round(this.bounds.width / scale) + this.wordWrapPadding;

          if (this.textarea.style.position !== 'relative') {
            this.textarea.style.width = `${tmp}px`;

            if (this.textarea.scrollWidth > tmp) {
              this.textarea.style.width = `${this.textarea.scrollWidth}px`;
            }
          } else {
            this.textarea.style.maxWidth = `${tmp}px`;
          }
        } else {
          // KNOWN: Trailing cursor in IE9 quirks mode is not visible
          this.textarea.style.whiteSpace = 'nowrap';
          this.textarea.style.width = '';
        }

        const ow = this.textarea.scrollWidth;
        const oh = this.textarea.scrollHeight;

        // TODO: Update CSS width and height if smaller than minResize or remove minResize
        // if (this.minResize != null)
        // {
        //  ow = Math.max(ow, this.minResize.width);
        //  oh = Math.max(oh, this.minResize.height);
        // }

        // LATER: Keep in visible area, add fine tuning for pixel precision
        this.textarea.style.left = `${Math.max(
          0,
          Math.round(this.bounds.x - m.x * (this.bounds.width - 2)) + 1
        )}px`;
        this.textarea.style.top = `${Math.max(
          0,
          Math.round(
            this.bounds.y -
              m.y * (this.bounds.height - 4) +
              (m.y === -1 ? 3 : 0)
          ) + 1
        )}px`;
      }

      setPrefixedStyle(
        this.textarea.style,
        'transformOrigin',
        '0px 0px'
      );
      setPrefixedStyle(
        this.textarea.style,
        'transform',
        `scale(${scale},${scale})${
          m == null ? '' : ` translate(${m.x * 100}%,${m.y * 100}%)`
        }`
      );
    }
  }

  /**
   * Function: focusLost
   *
   * Called if the textarea has lost focus.
   */
  // focusLost(): void;
  focusLost(): void {
    this.stopEditing(!this.graph.isInvokesStopCellEditing());
  }

  /**
   * Function: getBackgroundColor
   *
   * Returns the background color for the in-place editor. This implementation
   * always returns null.
   */
  // getBackgroundColor(state: mxCellState): string;
  getBackgroundColor(state: CellState): string | null {
    return null;
  }

  /**
   * Function: startEditing
   *
   * Starts the editor for the given cell.
   *
   * Parameters:
   *
   * cell - <mxCell> to start editing.
   * trigger - Optional mouse event that triggered the editor.
   */
  // startEditing(cell: mxCell, trigger?: MouseEvent): void;
  startEditing(
    cell: Cell,
    trigger: InternalMouseEvent | MouseEvent | null = null
  ): void {
    this.stopEditing(true);
    this.align = null;

    // Creates new textarea instance
    if (this.textarea == null) {
      this.init();
    }

    if (this.graph.tooltipHandler != null) {
      this.graph.tooltipHandler.hideTooltip();
    }

    const state = this.graph.getView().getState(cell);

    if (state != null) {
      // Configures the style of the in-place editor
      const { scale } = this.graph.getView();
      const size =
        state.style.fontSize != null ? state.style.fontSize : DEFAULT_FONTSIZE;
      const family =
        state.style.fontFamily != null
          ? state.style.fontFamily
          : DEFAULT_FONTFAMILY;
      const color = getValue(state.style, 'fontColor', 'black');
      const align = getValue(state.style, 'align', ALIGN_LEFT);
      const bold = (state.style.fontStyle || 0) & FONT_BOLD;
      const italic = (state.style.fontStyle || 0) & FONT_ITALIC;

      const txtDecor = [];
      if ((state.style.fontStyle || 0) & FONT_UNDERLINE) {
        txtDecor.push('underline');
      }
      if ((state.style.fontStyle || 0) & FONT_STRIKETHROUGH) {
        txtDecor.push('line-through');
      }

      const textarea = <HTMLElement>this.textarea;
      textarea.style.lineHeight = ABSOLUTE_LINE_HEIGHT
        ? `${Math.round(size * LINE_HEIGHT)}px`
        : String(LINE_HEIGHT);
      textarea.style.backgroundColor =
        this.getBackgroundColor(state) || 'transparent';
      textarea.style.textDecoration = txtDecor.join(' ');
      textarea.style.fontWeight = bold ? 'bold' : 'normal';
      textarea.style.fontStyle = italic ? 'italic' : '';
      textarea.style.fontSize = `${Math.round(size)}px`;
      textarea.style.zIndex = String(this.zIndex);
      textarea.style.fontFamily = family;
      textarea.style.textAlign = align;
      textarea.style.outline = 'none';
      textarea.style.color = color;

      let dir = (this.textDirection =
        state.style.textDirection != null
          ? state.style.textDirection
          : DEFAULT_TEXT_DIRECTION);

      if (dir === 'auto') {
        if (
          state.text != null &&
          state.text.dialect !== DIALECT_STRICTHTML &&
          !isNode(state.text.value)
        ) {
          dir = state.text.getAutoDirection();
        }
      }

      if (dir === 'ltr' || dir === 'rtl') {
        textarea.setAttribute('dir', dir);
      } else {
        textarea.removeAttribute('dir');
      }

      // Sets the initial editing value
      textarea.innerHTML =
        this.getInitialValue(state, <InternalMouseEvent>trigger) || '';
      this.initialValue = textarea.innerHTML;

      // Uses an optional text value for empty labels which is cleared
      // when the first keystroke appears. This makes it easier to see
      // that a label is being edited even if the label is empty.
      if (textarea.innerHTML.length === 0 || textarea.innerHTML === '<br>') {
        textarea.innerHTML = <string>this.getEmptyLabelText();
        this.clearOnChange = true;
      } else {
        this.clearOnChange = textarea.innerHTML === this.getEmptyLabelText();
      }

      // @ts-ignore
      this.graph.container.appendChild(textarea);

      // Update this after firing all potential events that could update the cleanOnChange flag
      this.editingCell = cell;
      this.trigger = trigger;
      this.textNode = null;

      if (state.text != null && this.isHideLabel(state)) {
        this.textNode = <SVGGElement>state.text.node;
        this.textNode.style.visibility = 'hidden';
      }

      // Workaround for initial offsetHeight not ready for heading in markup
      if (
        this.autoSize &&
        // @ts-ignore
        (this.graph.model.isEdge(state.cell) ||
          state.style.overflow !== 'fill')
      ) {
        window.setTimeout(() => {
          this.resize();
        }, 0);
      }

      this.resize();

      // Workaround for NS_ERROR_FAILURE in FF
      try {
        // Prefers blinking cursor over no selected text if empty
        textarea.focus();

        if (
          this.isSelectText() &&
          textarea.innerHTML.length > 0 &&
          (textarea.innerHTML !== this.getEmptyLabelText() ||
            !this.clearOnChange)
        ) {
          document.execCommand('selectAll', false);
        }
      } catch (e) {
        // ignore
      }
    }
  }

  /**
   * Function: isSelectText
   *
   * Returns <selectText>.
   */
  // isSelectText(): boolean;
  isSelectText() {
    return this.selectText;
  }

  /**
   * Function: clearSelection
   */
  // clearSelection(): void;
  clearSelection() {
    const selection = window.getSelection();

    if (selection != null) {
      if (selection.empty) {
        selection.empty();
      } else if (selection.removeAllRanges) {
        selection.removeAllRanges();
      }
    }
  }

  /**
   * Function: stopEditing
   *
   * Stops the editor and applies the value if cancel is false.
   */
  // stopEditing(cancel: boolean): void;
  stopEditing(cancel: boolean = false) {
    if (this.editingCell != null) {
      if (this.textNode != null) {
        this.textNode.style.visibility = 'visible';
        this.textNode = null;
      }

      const state = !cancel ? this.graph.view.getState(this.editingCell) : null;
      const textarea = <HTMLElement>this.textarea;

      const initial = this.initialValue;
      this.initialValue = null;
      this.editingCell = null;
      this.trigger = null;
      this.bounds = null;
      textarea.blur();
      this.clearSelection();

      if (textarea.parentNode != null) {
        textarea.parentNode.removeChild(textarea);
      }

      if (
        this.clearOnChange &&
        textarea.innerHTML === this.getEmptyLabelText()
      ) {
        textarea.innerHTML = '';
        this.clearOnChange = false;
      }

      if (
        state != null &&
        (textarea.innerHTML !== initial || this.align != null)
      ) {
        this.prepareTextarea();
        const value = this.getCurrentValue(state);

        this.graph.getModel().beginUpdate();
        try {
          if (value != null) {
            this.applyValue(state, value);
          }

          if (this.align != null) {
            this.graph.setCellStyles('align', this.align, [state.cell]);
          }
        } finally {
          this.graph.getModel().endUpdate();
        }
      }

      // Forces new instance on next edit for undo history reset
      InternalEvent.release(this.textarea);
      this.textarea = null;
      this.align = null;
    }
  }

  /**
   * Function: prepareTextarea
   *
   * Prepares the textarea for getting its value in <stopEditing>.
   * This implementation removes the extra trailing linefeed in Firefox.
   */
  // prepareTextarea(): void;
  prepareTextarea(): void {
    const textarea = <HTMLElement>this.textarea;
    if (textarea.lastChild != null && textarea.lastChild.nodeName === 'BR') {
      textarea.removeChild(textarea.lastChild);
    }
  }

  /**
   * Function: isHideLabel
   *
   * Returns true if the label should be hidden while the cell is being
   * edited.
   */
  // isHideLabel(state: mxCellState): boolean;
  isHideLabel(state: CellState | null = null): boolean {
    return true;
  }

  /**
   * Function: getMinimumSize
   *
   * Returns the minimum width and height for editing the given state.
   */
  // getMinimumSize(state: mxCellState): mxRectangle;
  getMinimumSize(state: CellState): Rectangle {
    const { scale } = this.graph.getView();
    const textarea = <HTMLElement>this.textarea;

    return new Rectangle(
      0,
      0,
      state.text == null ? 30 : state.text.size * scale + 20,
      textarea.style.textAlign === 'left' ? 120 : 40
    );
  }

  /**
   * Function: getEditorBounds
   *
   * Returns the <mxRectangle> that defines the bounds of the editor.
   */
  // getEditorBounds(state: mxCellState): mxRectangle;
  getEditorBounds(state: CellState): Rectangle | null {
    const isEdge = state.cell.isEdge();
    const { scale } = this.graph.getView();
    const minSize = this.getMinimumSize(state);
    const minWidth = minSize.width;
    const minHeight = minSize.height;
    let result = null;

    if (
      !isEdge &&
      state.view.graph.cellRenderer.legacySpacing &&
      state.style.overflow === 'fill'
    ) {
      result = (<Shape>state.shape).getLabelBounds(
        Rectangle.fromRectangle(state)
      );
    } else {
      // @ts-ignore
      const dummy = new TextShape(); // FIXME!!!! ===================================================================================================
      const spacing: number = parseInt(state.style.spacing || 0) * scale;
      const spacingTop: number =
        (parseInt(state.style.spacingTop || 0) + dummy.baseSpacingTop) * scale +
        spacing;
      const spacingRight: number =
        (parseInt(state.style.spacingRight || 0) + dummy.baseSpacingRight) *
          scale +
        spacing;
      const spacingBottom: number =
        (parseInt(state.style.spacingBottom || 0) + dummy.baseSpacingBottom) *
          scale +
        spacing;
      const spacingLeft: number =
        (parseInt(state.style.spacingLeft || 0) + dummy.baseSpacingLeft) *
          scale +
        spacing;

      result = new Rectangle(
        state.x,
        state.y,
        Math.max(minWidth, state.width - spacingLeft - spacingRight),
        Math.max(minHeight, state.height - spacingTop - spacingBottom)
      );
      const hpos: string =
        state.style.labelPosition != null
          ? state.style.labelPosition
          : 'center';
      const vpos: string =
        state.style.verticalLabelPosition != null
          ? state.style.verticalLabelPosition
          : 'middle';

      result =
        state.shape != null && hpos === 'center' && vpos === 'middle'
          ? state.shape.getLabelBounds(result)
          : result;

      if (isEdge) {
        result.x = state.absoluteOffset.x;
        result.y = state.absoluteOffset.y;

        if (state.text != null && state.text.boundingBox != null) {
          // Workaround for label containing just spaces in which case
          // the bounding box location contains negative numbers
          if (state.text.boundingBox.x > 0) {
            result.x = state.text.boundingBox.x;
          }

          if (state.text.boundingBox.y > 0) {
            result.y = state.text.boundingBox.y;
          }
        }
      } else if (state.text != null && state.text.boundingBox != null) {
        result.x = Math.min(result.x, state.text.boundingBox.x);
        result.y = Math.min(result.y, state.text.boundingBox.y);
      }

      result.x += spacingLeft;
      result.y += spacingTop;

      if (state.text != null && state.text.boundingBox != null) {
        if (!isEdge) {
          result.width = Math.max(result.width, state.text.boundingBox.width);
          result.height = Math.max(
            result.height,
            state.text.boundingBox.height
          );
        } else {
          result.width = Math.max(minWidth, state.text.boundingBox.width);
          result.height = Math.max(minHeight, state.text.boundingBox.height);
        }
      }

      // Applies the horizontal and vertical label positions
      if (state.cell.isVertex()) {
        const horizontal: string = <string>(
          getStringValue(
            state.style,
            'labelPosition',
            ALIGN_CENTER
          )
        );

        if (horizontal === 'left') {
          result.x -= state.width;
        } else if (horizontal === 'right') {
          result.x += state.width;
        }

        const vertical: string =
          state.style.verticalLabelPosition != null
            ? state.style.verticalLabelPosition
            : 'middle';

        if (vertical === 'top') {
          result.y -= state.height;
        } else if (vertical === 'bottom') {
          result.y += state.height;
        }
      }
    }

    return new Rectangle(
      Math.round(result.x),
      Math.round(result.y),
      Math.round(result.width),
      Math.round(result.height)
    );
  }

  /**
   * Function: getEmptyLabelText
   *
   * Returns the initial label value to be used of the label of the given
   * cell is empty. This label is displayed and cleared on the first keystroke.
   * This implementation returns <emptyLabelText>.
   *
   * Parameters:
   *
   * cell - <mxCell> for which a text for an empty editing box should be
   * returned.
   */
  // getEmptyLabelText(cell: mxCell): string;
  getEmptyLabelText(cell: Cell | null = null): string {
    return this.emptyLabelText || '';
  }

  /**
   * Function: getEditingCell
   *
   * Returns the cell that is currently being edited or null if no cell is
   * being edited.
   */
  // getEditingCell(): mxCell;
  getEditingCell(): Cell | null {
    return this.editingCell;
  }

  /**
   * Function: destroy
   *
   * Destroys the editor and removes all associated resources.
   */
  // destroy(): void;
  destroy(): void {
    if (this.textarea != null) {
      InternalEvent.release(this.textarea);
      if (this.textarea.parentNode != null) {
        this.textarea.parentNode.removeChild(this.textarea);
      }
      this.textarea = null;
    }

    if (this.changeHandler != null) {
      this.graph.getModel().removeListener(this.changeHandler);
      this.changeHandler = null;
    }

    if (this.zoomHandler) {
      this.graph.view.removeListener(this.zoomHandler);
      this.zoomHandler = null;
    }
  }
}

export default CellEditor;
