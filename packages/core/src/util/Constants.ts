/**
 * Copyright (c) 2006-2015, JGraph Ltd
 * Copyright (c) 2006-2015, Gaudenz Alder
 * Updated to ES9 syntax by David Morrissey 2021
 * Type definitions from the typed-mxgraph project
 */

/**
 * Variable: DEFAULT_HOTSPOT
 *
 * Defines the portion of the cell which is to be used as a connectable
 * region. Default is 0.3. Possible values are 0 < x <= 1.
 */
export const DEFAULT_HOTSPOT = 0.3;

/**
 * Variable: MIN_HOTSPOT_SIZE
 *
 * Defines the minimum size in pixels of the portion of the cell which is
 * to be used as a connectable region. Default is 8.
 */
export const MIN_HOTSPOT_SIZE = 8;

/**
 * Variable: MAX_HOTSPOT_SIZE
 *
 * Defines the maximum size in pixels of the portion of the cell which is
 * to be used as a connectable region. Use 0 for no maximum. Default is 0.
 */
export const MAX_HOTSPOT_SIZE = 0;

/**
 * Variable: RENDERING_HINT_EXACT
 *
 * Defines the exact rendering hint.
 *
 * Variable: RENDERING_HINT_FASTER
 *
 * Defines the faster rendering hint.
 *
 * Variable: RENDERING_HINT_FASTEST
 *
 * Defines the fastest rendering hint.
 */
export const enum RENDERING_HINT {
    EXACT = 'exact',
    FASTER = 'faster',
    FASTEST = 'fastest',
};

/**
 * - DIALECT_SVG: Defines the SVG display dialect name.
 *
 * - DIALECT_MIXEDHTML: Defines the mixed HTML display dialect name.
 *
 * - DIALECT_PREFERHTML: Defines the preferred HTML display dialect name.
 *
 * - DIALECT_STRICTHTML: Defines the strict HTML display dialect.
 */
export const enum DIALECT {
    SVG = 'svg',
    MIXEDHTML = 'mixedHtml',
    PREFERHTML = 'preferHtml',
    STRICTHTML = 'strictHtml',
};

/**
 * Variable: NS_SVG
 *
 * Defines the SVG namespace.
 */
export const NS_SVG = 'http://www.w3.org/2000/svg';

/**
 * Variable: NS_XLINK
 *
 * Defines the XLink namespace.
 */
export const NS_XLINK = 'http://www.w3.org/1999/xlink';

/**
 * Variable: SHADOWCOLOR
 *
 * Defines the color to be used to draw shadows in shapes and windows.
 * Default is gray.
 */
export const SHADOWCOLOR = 'gray';

/**
 * Variable: SHADOW_OFFSET_X
 *
 * Specifies the x-offset of the shadow. Default is 2.
 */
export const SHADOW_OFFSET_X = 2;

/**
 * Variable: SHADOW_OFFSET_Y
 *
 * Specifies the y-offset of the shadow. Default is 3.
 */
export const SHADOW_OFFSET_Y = 3;

/**
 * Variable: SHADOW_OPACITY
 *
 * Defines the opacity for shadows. Default is 1.
 */
export const SHADOW_OPACITY = 1;

export const enum NODETYPE {
    ELEMENT = 1,
    ATTRIBUTE = 2,
    TEXT = 3,
    CDATA = 4,
    ENTITY_REFERENCE = 5,
    ENTITY = 6,
    PROCESSING_INSTRUCTION = 7,
    COMMENT = 8,
    DOCUMENT = 9,
    DOCUMENTTYPE = 10,
    DOCUMENT_FRAGMENT = 11,
    NOTATION = 12,
}

/**
 * Variable: TOOLTIP_VERTICAL_OFFSET
 *
 * Defines the vertical offset for the tooltip.
 * Default is 16.
 */
export const TOOLTIP_VERTICAL_OFFSET = 16;

/**
 * Variable: DEFAULT_VALID_COLOR
 *
 * Specifies the default valid color. Default is #0000FF.
 */
export const DEFAULT_VALID_COLOR = '#00FF00';

/**
 * Variable: DEFAULT_INVALID_COLOR
 *
 * Specifies the default invalid color. Default is #FF0000.
 */
export const DEFAULT_INVALID_COLOR = '#FF0000';

/**
 * Variable: OUTLINE_HIGHLIGHT_COLOR
 *
 * Specifies the default highlight color for shape outlines.
 * Default is #0000FF. This is used in <mxEdgeHandler>.
 */
export const OUTLINE_HIGHLIGHT_COLOR = '#00FF00';

/**
 * Variable: OUTLINE_HIGHLIGHT_COLOR
 *
 * Defines the strokewidth to be used for shape outlines.
 * Default is 5. This is used in <mxEdgeHandler>.
 */
export const OUTLINE_HIGHLIGHT_STROKEWIDTH = 5;

/**
 * Variable: HIGHLIGHT_STROKEWIDTH
 *
 * Defines the strokewidth to be used for the highlights.
 * Default is 3.
 */
export const HIGHLIGHT_STROKEWIDTH = 3;

/**
 * Variable: CONSTRAINT_HIGHLIGHT_SIZE
 *
 * Size of the constraint highlight (in px). Default is 2.
 */
export const HIGHLIGHT_SIZE = 2;

/**
 * Variable: HIGHLIGHT_OPACITY
 *
 * Opacity (in %) used for the highlights (including outline).
 * Default is 100.
 */
export const HIGHLIGHT_OPACITY = 100;

/**
 * - CURSOR_MOVABLE_VERTEX: Defines the cursor for a movable vertex. Default is 'move'.
 *
 * - CURSOR_MOVABLE_EDGE: Defines the cursor for a movable edge. Default is 'move'.
 *
 * - CURSOR_LABEL_HANDLE: Defines the cursor for a movable label. Default is 'default'.
 *
 * - CURSOR_TERMINAL_HANDLE: Defines the cursor for a terminal handle. Default is 'pointer'.
 *
 * - CURSOR_BEND_HANDLE: Defines the cursor for a movable bend. Default is 'crosshair'.
 *
 * - CURSOR_VIRTUAL_BEND_HANDLE: Defines the cursor for a movable bend. Default is 'crosshair'.
 *
 * - CURSOR_CONNECT: Defines the cursor for a connectable state. Default is 'pointer'.
 */
export const enum CURSOR {
    MOVABLE_VERTEX = 'move',
    MOVABLE_EDGE = 'move',
    LABEL_HANDLE = 'default',
    TERMINAL_HANDLE = 'pointer',
    BEND_HANDLE = 'crosshair',
    VIRTUAL_BEND_HANDLE = 'crosshair',
    CONNECT = 'pointer',
};

/**
 * Variable: HIGHLIGHT_COLOR
 *
 * Defines the color to be used for the cell highlighting.
 * Use 'none' for no color. Default is #00FF00.
 */
export const HIGHLIGHT_COLOR = '#00FF00';

/**
 * Variable: TARGET_HIGHLIGHT_COLOR
 *
 * Defines the color to be used for highlighting a target cell for a new
 * or changed connection. Note that this may be either a source or
 * target terminal in the graph. Use 'none' for no color.
 * Default is #0000FF.
 */
export const CONNECT_TARGET_COLOR = '#0000FF';

/**
 * Variable: INVALID_CONNECT_TARGET_COLOR
 *
 * Defines the color to be used for highlighting a invalid target cells
 * for a new or changed connections. Note that this may be either a source
 * or target terminal in the graph. Use 'none' for no color. Default is
 * #FF0000.
 */
export const INVALID_CONNECT_TARGET_COLOR = '#FF0000';

/**
 * Variable: DROP_TARGET_COLOR
 *
 * Defines the color to be used for the highlighting target parent cells
 * (for drag and drop). Use 'none' for no color. Default is #0000FF.
 */
export const DROP_TARGET_COLOR = '#0000FF';

/**
 * Variable: VALID_COLOR
 *
 * Defines the color to be used for the coloring valid connection
 * previews. Use 'none' for no color. Default is #FF0000.
 */
export const VALID_COLOR = '#00FF00';

/**
 * Variable: INVALID_COLOR
 *
 * Defines the color to be used for the coloring invalid connection
 * previews. Use 'none' for no color. Default is #FF0000.
 */
export const INVALID_COLOR = '#FF0000';

/**
 * Variable: EDGE_SELECTION_COLOR
 *
 * Defines the color to be used for the selection border of edges. Use
 * 'none' for no color. Default is #00FF00.
 */
export const EDGE_SELECTION_COLOR = '#00FF00';

/**
 * Variable: VERTEX_SELECTION_COLOR
 *
 * Defines the color to be used for the selection border of vertices. Use
 * 'none' for no color. Default is #00FF00.
 */
export const VERTEX_SELECTION_COLOR = '#00FF00';

/**
 * Variable: VERTEX_SELECTION_STROKEWIDTH
 *
 * Defines the strokewidth to be used for vertex selections.
 * Default is 1.
 */
export const VERTEX_SELECTION_STROKEWIDTH = 1;

/**
 * Variable: EDGE_SELECTION_STROKEWIDTH
 *
 * Defines the strokewidth to be used for edge selections.
 * Default is 1.
 */
export const EDGE_SELECTION_STROKEWIDTH = 1;

/**
 * Variable: SELECTION_DASHED
 *
 * Defines the dashed state to be used for the vertex selection
 * border. Default is true.
 */
export const VERTEX_SELECTION_DASHED = true;

/**
 * Variable: SELECTION_DASHED
 *
 * Defines the dashed state to be used for the edge selection
 * border. Default is true.
 */
export const EDGE_SELECTION_DASHED = true;

/**
 * Variable: GUIDE_COLOR
 *
 * Defines the color to be used for the guidelines in mxGraphHandler.
 * Default is #FF0000.
 */
export const GUIDE_COLOR = '#FF0000';

/**
 * Variable: GUIDE_STROKEWIDTH
 *
 * Defines the strokewidth to be used for the guidelines in mxGraphHandler.
 * Default is 1.
 */
export const GUIDE_STROKEWIDTH = 1;

/**
 * Variable: OUTLINE_COLOR
 *
 * Defines the color to be used for the outline rectangle
 * border.  Use 'none' for no color. Default is #0099FF.
 */
export const OUTLINE_COLOR = '#0099FF';

/**
 * Variable: OUTLINE_STROKEWIDTH
 *
 * Defines the strokewidth to be used for the outline rectangle
 * stroke width. Default is 3.
 */
export const OUTLINE_STROKEWIDTH = 3;

/**
 * Variable: HANDLE_SIZE
 *
 * Defines the default size for handles. Default is 6.
 */
export const HANDLE_SIZE = 6;

/**
 * Variable: LABEL_HANDLE_SIZE
 *
 * Defines the default size for label handles. Default is 4.
 */
export const LABEL_HANDLE_SIZE = 4;

/**
 * Variable: HANDLE_FILLCOLOR
 *
 * Defines the color to be used for the handle fill color. Use 'none' for
 * no color. Default is #00FF00 (green).
 */
export const HANDLE_FILLCOLOR = '#00FF00';

/**
 * Variable: HANDLE_STROKECOLOR
 *
 * Defines the color to be used for the handle stroke color. Use 'none' for
 * no color. Default is black.
 */
export const HANDLE_STROKECOLOR = 'black';

/**
 * Variable: LABEL_HANDLE_FILLCOLOR
 *
 * Defines the color to be used for the label handle fill color. Use 'none'
 * for no color. Default is yellow.
 */
export const LABEL_HANDLE_FILLCOLOR = 'yellow';

/**
 * Variable: CONNECT_HANDLE_FILLCOLOR
 *
 * Defines the color to be used for the connect handle fill color. Use
 * 'none' for no color. Default is #0000FF (blue).
 */
export const CONNECT_HANDLE_FILLCOLOR = '#0000FF';

/**
 * Variable: LOCKED_HANDLE_FILLCOLOR
 *
 * Defines the color to be used for the locked handle fill color. Use
 * 'none' for no color. Default is #FF0000 (red).
 */
export const LOCKED_HANDLE_FILLCOLOR = '#FF0000';

/**
 * Variable: OUTLINE_HANDLE_FILLCOLOR
 *
 * Defines the color to be used for the outline sizer fill color. Use
 * 'none' for no color. Default is #00FFFF.
 */
export const OUTLINE_HANDLE_FILLCOLOR = '#00FFFF';

/**
 * Variable: OUTLINE_HANDLE_STROKECOLOR
 *
 * Defines the color to be used for the outline sizer stroke color. Use
 * 'none' for no color. Default is #0033FF.
 */
export const OUTLINE_HANDLE_STROKECOLOR = '#0033FF';

/**
 * Variable: DEFAULT_FONTFAMILY
 *
 * Defines the default family for all fonts. Default is Arial,Helvetica.
 */
export const DEFAULT_FONTFAMILY = 'Arial,Helvetica';

/**
 * Variable: DEFAULT_FONTSIZE
 *
 * Defines the default size (in px). Default is 11.
 */
export const DEFAULT_FONTSIZE = 11;

/**
 * Variable: DEFAULT_TEXT_DIRECTION
 *
 * Defines the default value for the <STYLE_TEXT_DIRECTION> if no value is
 * defined for it in the style. Default value is an empty string which means
 * the default system setting is used and no direction is set.
 */
export const DEFAULT_TEXT_DIRECTION = '';

/**
 * Variable: LINE_HEIGHT
 *
 * Defines the default line height for text labels. Default is 1.2.
 */
export const LINE_HEIGHT = 1.2;

/**
 * Variable: WORD_WRAP
 *
 * Defines the CSS value for the word-wrap property. Default is "normal".
 * Change this to "break-word" to allow long words to be able to be broken
 * and wrap onto the next line.
 */
export const WORD_WRAP = 'normal';

/**
 * Variable: ABSOLUTE_LINE_HEIGHT
 *
 * Specifies if absolute line heights should be used (px) in CSS. Default
 * is false. Set this to true for backwards compatibility.
 */
export const ABSOLUTE_LINE_HEIGHT = false;

/**
 * Variable: DEFAULT_FONTSTYLE
 *
 * Defines the default style for all fonts. Default is 0. This can be set
 * to any combination of font styles as follows.
 *
 * ```javascript
 * mxConstants.DEFAULT_FONTSTYLE = mxConstants.FONT_BOLD | mxConstants.FONT_ITALIC;
 * ```
 */
export const DEFAULT_FONTSTYLE = 0;

/**
 * Variable: DEFAULT_STARTSIZE
 *
 * Defines the default start size for swimlanes. Default is 40.
 */
export const DEFAULT_STARTSIZE = 40;

/**
 * Variable: DEFAULT_MARKERSIZE
 *
 * Defines the default size for all markers. Default is 6.
 */
export const DEFAULT_MARKERSIZE = 6;

/**
 * Variable: DEFAULT_IMAGESIZE
 *
 * Defines the default width and height for images used in the
 * label shape. Default is 24.
 */
export const DEFAULT_IMAGESIZE = 24;

/**
 * Variable: ENTITY_SEGMENT
 *
 * Defines the length of the horizontal segment of an Entity Relation.
 * This can be overridden using <'segment'> style.
 * Default is 30.
 */
export const ENTITY_SEGMENT = 30;

/**
 * Variable: RECTANGLE_ROUNDING_FACTOR
 *
 * Defines the rounding factor for rounded rectangles in percent between
 * 0 and 1. Values should be smaller than 0.5. Default is 0.15.
 */
export const RECTANGLE_ROUNDING_FACTOR = 0.15;

/**
 * Variable: LINE_ARCSIZE
 *
 * Defines the size of the arcs for rounded edges. Default is 20.
 */
export const LINE_ARCSIZE = 20;

/**
 * Variable: ARROW_SPACING
 *
 * Defines the spacing between the arrow shape and its terminals. Default is 0.
 */
export const ARROW_SPACING = 0;

/**
 * Variable: ARROW_WIDTH
 *
 * Defines the width of the arrow shape. Default is 30.
 */
export const ARROW_WIDTH = 30;

/**
 * Variable: ARROW_SIZE
 *
 * Defines the size of the arrowhead in the arrow shape. Default is 30.
 */
export const ARROW_SIZE = 30;

/**
 * Variable: PAGE_FORMAT_A4_PORTRAIT
 *
 * Defines the rectangle for the A4 portrait page format. The dimensions
 * of this page format are 826x1169 pixels.
 */
export const PAGE_FORMAT_A4_PORTRAIT = [0, 0, 827, 1169];

/**
 * Variable: PAGE_FORMAT_A4_PORTRAIT
 *
 * Defines the rectangle for the A4 portrait page format. The dimensions
 * of this page format are 826x1169 pixels.
 */
export const PAGE_FORMAT_A4_LANDSCAPE = [0, 0, 1169, 827];

/**
 * Variable: PAGE_FORMAT_LETTER_PORTRAIT
 *
 * Defines the rectangle for the Letter portrait page format. The
 * dimensions of this page format are 850x1100 pixels.
 */
export const PAGE_FORMAT_LETTER_PORTRAIT = [0, 0, 850, 1100];

/**
 * Variable: PAGE_FORMAT_LETTER_PORTRAIT
 *
 * Defines the rectangle for the Letter portrait page format. The dimensions
 * of this page format are 850x1100 pixels.
 */
export const PAGE_FORMAT_LETTER_LANDSCAPE = [0, 0, 1100, 850];

/**
 * Variable: NONE
 *
 * Defines the value for none. Default is "none".
 */
export const NONE = 'none';

/**
 * - FONT_BOLD: Constant for bold fonts. Default is 1.
 *
 * - FONT_ITALIC: Constant for italic fonts. Default is 2.
 *
 * - FONT_UNDERLINE: Constant for underlined fonts. Default is 4.
 *
 * - FONT_STRIKETHROUGH: Constant for strikthrough fonts. Default is 8.
 */
export const enum FONT {
    BOLD = 1,
    ITALIC = 2,
    UNDERLINE = 4,
    STRIKETHROUGH = 8,
};

/**
 * - ARROW_CLASSIC: Constant for classic arrow markers.
 *
 * - ARROW_CLASSIC_THIN: Constant for thin classic arrow markers.
 *
 * - ARROW_BLOCK: Constant for block arrow markers.
 *
 * - ARROW_BLOCK_THIN: Constant for thin block arrow markers.
 *
 * - ARROW_OPEN: Constant for open arrow markers.
 *
 * - ARROW_OPEN_THIN: Constant for thin open arrow markers.
 *
 * - ARROW_OVAL: Constant for oval arrow markers.
 *
 * - ARROW_DIAMOND: Constant for diamond arrow markers.
 *
 * - ARROW_DIAMOND_THIN: Constant for thin diamond arrow markers.
 */
export const enum ARROW {
    CLASSIC = 'classic',
    CLASSIC_THIN = 'classicThin',
    BLOCK = 'block',
    BLOCK_THIN = 'blockThin',
    OPEN = 'open',
    OPEN_THIN = 'openThin',    
    OVAL = 'oval',
    DIAMOND = 'diamond',
    DIAMOND_THIN = 'diamondThin',
};

/**
 * - ALIGN_LEFT: Constant for left horizontal alignment. Default is left.
 *
 * - ALIGN_CENTER: Constant for center horizontal alignment. Default is center.
 *
 * - ALIGN_RIGHT: Constant for right horizontal alignment. Default is right.
 *
 * - ALIGN_TOP: Constant for top vertical alignment. Default is top.
 *
 * - ALIGN_MIDDLE: Constant for middle vertical alignment. Default is middle.
 *
 * - ALIGN_BOTTOM: Constant for bottom vertical alignment. Default is bottom.
 */
export const enum ALIGN {
    LEFT = 'left',
    CENTER = 'center',
    RIGHT = 'right',
    TOP = 'top',
    MIDDLE = 'middle',
    BOTTOM = 'bottom',
};

export const enum DIRECTION {
    NORTH = 'north',
    SOUTH = 'south',
    EAST = 'east',
    WEST = 'west',
}

/**
 * Variable: TEXT_DIRECTION_DEFAULT
 *
 * Constant for text direction default. Default is an empty string. Use
 * this value to use the default text direction of the operating system.
 *
 * Variable: TEXT_DIRECTION_AUTO
 *
 * Constant for text direction automatic. Default is auto. Use this value
 * to find the direction for a given text with <mxText.getAutoDirection>.
*
 * Variable: TEXT_DIRECTION_LTR
 *
 * Constant for text direction left to right. Default is ltr. Use this
 * value for left to right text direction.
 * 
 * Variable: TEXT_DIRECTION_RTL
 *
 * Constant for text direction right to left. Default is rtl. Use this
 * value for right to left text direction.
 */
export const enum TEXT_DIRECTION {
    DEFAULT = '',
    AUTO = 'auto',
    LTR = 'ltr',
    RTL = 'rtl',
};

/**
 * - DIRECTION_MASK_NONE: Constant for no direction.
 *
 * - DIRECTION_MASK_WEST: Bitwise mask for west direction.
 *
 * - DIRECTION_MASK_NORTH: Bitwise mask for north direction.
 *
 * - DIRECTION_MASK_SOUTH: Bitwise mask for south direction.
 *
 * - DIRECTION_MASK_EAST: Bitwise mask for east direction.
 *
 * - DIRECTION_MASK_ALL: Bitwise mask for all directions.
 */
export const DIRECTION_MASK = {
    NONE: 0,
    WEST: 1,
    NORTH: 2,
    SOUTH: 4,
    EAST: 8,
    ALL: 15,
};

/**
 * Variable: ELBOW
 * 
 * Default is horizontal.
 */
export const enum ELBOW {
    VERTICAL = 'vertical',
    HORIZONTAL = 'horizontal',
};

/**
 * Variable: EDGESTYLE
 *
 * Can be used as a string value for the STYLE_EDGE style.
 */
export const enum EDGESTYLE {
    ELBOW = 'elbowEdgeStyle',
    ENTITY_RELATION = 'entityRelationEdgeStyle',
    LOOP = 'loopEdgeStyle',
    SIDETOSIDE = 'sideToSideEdgeStyle',
    TOPTOBOTTOM = 'topToBottomEdgeStyle',
    ORTHOGONAL = 'orthogonalEdgeStyle',
    SEGMENT = 'segmentEdgeStyle',
};

/**
 * Can be used as a string value for the STYLE_PERIMETER style.
 */
export const enum PERIMETER {
    ELLIPSE = 'ellipsePerimeter',
    RECTANGLE = 'rectanglePerimeter',
    RHOMBUS = 'rhombusPerimeter',
    HEXAGON = 'hexagonPerimeter',
    TRIANGLE = 'trianglePerimeter'
};
