/**
 * Copyright (c) 2006-2013, JGraph Ltd
  
  Menustyle. This example demonstrates using
  CSS to style the mxPopupMenu.
 */

import React from 'react';
import mxEvent from '../mxgraph/util/mxEvent';
import mxGraph from '../mxgraph/view/mxGraph';
import mxRubberband from '../mxgraph/handler/mxRubberband';

class MenuStyle extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    // A container for the graph
    return (
      <>
        <h1>Menustyle</h1>

        <div
          ref={el => {
            this.el = el;
          }}
          style={{

          }}
        />
      </>
    );
  };

  componentDidMount() {

  };
}

export default MenuStyle;


<html>
<head>
  <title></title>

  <style type="text/css">
    body div.mxPopupMenu {
      -webkit-box-shadow: 3px 3px 6px #C0C0C0;
      -moz-box-shadow: 3px 3px 6px #C0C0C0;
      box-shadow: 3px 3px 6px #C0C0C0;
      background: white;
      position: absolute;
      border: 3px solid #e7e7e7;
      padding: 3px;
    }
    body table.mxPopupMenu {
      border-collapse: collapse;
      margin: 0px;
    }
    body tr.mxPopupMenuItem {
      color: black;
      cursor: default;
    }
    body td.mxPopupMenuItem {
      padding: 6px 60px 6px 30px;
      font-family: Arial;
      font-size: 10pt;
    }
    body td.mxPopupMenuIcon {
      background-color: white;
      padding: 0px;
    }
    body tr.mxPopupMenuItemHover {
      background-color: #eeeeee;
      color: black;
    }
    table.mxPopupMenu hr {
      border-top: solid 1px #cccccc;
    }
    table.mxPopupMenu tr {
      font-size: 4pt;
    }
  </style>

  <!-- Sets the basepath for the library if not in same directory -->
  <script type="text/javascript">
    mxBasePath = '../src';
  </script>

  <!-- Loads and initializes the library -->
  <script type="text/javascript" src="../src/js/mxClient.js"></script>

  <!-- Example code -->
  <script type="text/javascript">
    // Program starts here. Creates a sample graph in the
    // DOM node with the specified ID. This function is invoked
    // from the onLoad event handler of the document (see below).
    function main(container)
    {
      // Checks if the browser is supported
      if (!mxClient.isBrowserSupported())
      {
        // Displays an error message if the browser is not supported.
        mxUtils.error('Browser is not supported!', 200, false);
      }
      else
      {
        // Disables built-in context menu
        mxEvent.disableContextMenu(document.body);

        // Changes some default colors
        mxConstants.HANDLE_FILLCOLOR = '#99ccff';
        mxConstants.HANDLE_STROKECOLOR = '#0088cf';
        mxConstants.VERTEX_SELECTION_COLOR = '#00a8ff';

        // Creates the graph inside the given container
        let graph = new mxGraph(container);
        graph.setTooltips(true);

        // Enables rubberband selection
        new mxRubberband(graph);

        // Gets the default parent for inserting new cells. This
        // is normally the first child of the root (ie. layer 0).
        let parent = graph.getDefaultParent();

        // Adds cells to the model in a single step
        graph.getModel().beginUpdate();
        try
        {
          var v1 = graph.insertVertex(parent, null, 'Hello,', 20, 20, 80, 30);
          var v2 = graph.insertVertex(parent, null, 'World!', 200, 150, 80, 30);
          var e1 = graph.insertEdge(parent, null, '', v1, v2);
        }
        finally
        {
          // Updates the display
          graph.getModel().endUpdate();
        }

        // Creates a new overlay with an image and a tooltip and makes it "transparent" to events
        let overlay = new mxCellOverlay(new mxImage('editors/images/overlays/check.png', 16, 16), 'Overlay tooltip');

        let mxCellRendererInstallCellOverlayListeners = mxCellRenderer.prototype.installCellOverlayListeners;
        mxCellRenderer.prototype.installCellOverlayListeners = function(state, overlay, shape)
        {
          mxCellRendererInstallCellOverlayListeners.apply(this, arguments);
          var graph  = state.view.graph;

          mxEvent.addGestureListeners(shape.node,
            function (evt)
            {
              graph.fireMouseEvent(mxEvent.MOUSE_DOWN, new mxMouseEvent(evt, state));
            },
            function (evt)
            {
              graph.fireMouseEvent(mxEvent.MOUSE_MOVE, new mxMouseEvent(evt, state));
            },
            function (evt)
            {
            });

          if (!mxClient.IS_TOUCH)
          {
            mxEvent.addListener(shape.node, 'mouseup', function (evt)
            {
              overlay.fireEvent(new mxEventObject(mxEvent.CLICK,
                  'event', evt, 'cell', state.cell));
            });
          }
        };

        // Sets the overlay for the cell in the graph
        graph.addCellOverlay(v1, overlay);

        // Configures automatic expand on mouseover
        graph.popupMenuHandler.autoExpand = true;

          // Installs context menu
        graph.popupMenuHandler.factoryMethod = function(menu, cell, evt)
        {
          menu.addItem('Item 1', null, function()
            {
            alert('Item 1');
            });

          menu.addItem('Item 2', null, function()
            {
            alert('Item 2');
            });

          menu.addSeparator();

          var submenu1 = menu.addItem('Submenu 1', null, null);

          menu.addItem('Subitem 1', null, function()
            {
            alert('Subitem 1');
            }, submenu1);
          menu.addItem('Subitem 1', null, function()
            {
            alert('Subitem 2');
            }, submenu1);
        };
      }
    };
  </script>
</head>

<!-- Page passes the container for the graph to the program -->
<body onload="main(document.getElementById('graphContainer'))">

  <!-- Creates a container for the graph with a grid wallpaper -->
  <div id="graphContainer"
    style="overflow:hidden;width:321px;height:241px;background:url('editors/images/grid.gif');cursor:default;">
  </div>
</body>
</html>
