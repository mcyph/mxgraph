/**
 * Copyright (c) 2006-2013, JGraph Ltd
 */

import React from 'react';
import mxEvent from '../mxgraph/util/mxEvent';
import mxGraph from '../mxgraph/view/mxGraph';
import mxRubberband from '../mxgraph/handler/mxRubberband';

class MYNAMEHERE extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    // A container for the graph
    return (
      <>
        <h1>HTML label</h1>
        This example demonstrates using
        HTML labels that are connected to the state of the user object.

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

export default MYNAMEHERE;


<html>
<head>
  <title></title>

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
        // Disables the built-in context menu
        mxEvent.disableContextMenu(container);

        // Creates the graph inside the given container
        let graph = new mxGraph(container);

        // Enables HTML labels
        graph.setHtmlLabels(true);

        // Enables rubberband selection
        new mxRubberband(graph);

        // Creates a user object that stores the state
        let doc = mxUtils.createXmlDocument();
        let obj = doc.createElement('UserObject');
        obj.setAttribute('label', 'Hello, World!');
        obj.setAttribute('checked', 'false');

        // Adds optional caching for the HTML label
        let cached = true;

        if (cached)
        {
          // Ignores cached label in codec
          mxCodecRegistry.getCodec(mxCell).exclude.push('div');

          // Invalidates cached labels
          graph.model.setValue = function(cell, value)
          {
            cell.div = null;
            mxGraphModel.prototype.setValue.apply(this, arguments);
          };
        }

        // Overrides method to provide a cell label in the display
        graph.convertValueToString = function(cell)
        {
          if (cached && cell.div != null)
          {
            // Uses cached label
            return cell.div;
          }
          else if (mxUtils.isNode(cell.value) && cell.value.nodeName.toLowerCase() == 'userobject')
          {
            // Returns a DOM for the label
            let div = document.createElement('div');
            div.innerHTML = cell.getAttribute('label');
            mxUtils.br(div);

            let checkbox = document.createElement('input');
            checkbox.setAttribute('type', 'checkbox');

            if (cell.getAttribute('checked') == 'true')
            {
              checkbox.setAttribute('checked', 'checked');
              checkbox.defaultChecked = true;
            }

            // Writes back to cell if checkbox is clicked
            mxEvent.addListener(checkbox, 'change', function(evt)
            {
              let elt = cell.value.cloneNode(true);
              elt.setAttribute('checked', (checkbox.checked) ? 'true' : 'false');

              graph.model.setValue(cell, elt);
            });

            div.appendChild(checkbox);

            if (cached)
            {
              // Caches label
              cell.div = div;
            }

            return div;
          }

          return '';
        };

        // Overrides method to store a cell label in the model
        let cellLabelChanged = graph.cellLabelChanged;
        graph.cellLabelChanged = function(cell, newValue, autoSize)
        {
          if (mxUtils.isNode(cell.value) && cell.value.nodeName.toLowerCase() == 'userobject')
          {
            // Clones the value for correct undo/redo
            let elt = cell.value.cloneNode(true);
            elt.setAttribute('label', newValue);
            newValue = elt;
          }

          cellLabelChanged.apply(this, arguments);
        };

        // Overrides method to create the editing value
        let getEditingValue = graph.getEditingValue;
        graph.getEditingValue = function(cell)
        {
          if (mxUtils.isNode(cell.value) && cell.value.nodeName.toLowerCase() == 'userobject')
          {
            return cell.getAttribute('label');
          }
        };

        let parent = graph.getDefaultParent();
        graph.insertVertex(parent, null, obj, 20, 20, 80, 60);

        // Undo/redo
        let undoManager = new mxUndoManager();
        let listener = function(sender, evt)
        {
          undoManager.undoableEditHappened(evt.getProperty('edit'));
        };
        graph.getModel().addListener(mxEvent.UNDO, listener);
        graph.getView().addListener(mxEvent.UNDO, listener);

        document.body.appendChild(mxUtils.button('Undo', function()
        {
          undoManager.undo();
        }));

        document.body.appendChild(mxUtils.button('Redo', function()
        {
          undoManager.redo();
        }));
      }
    };
  </script>
</head>

<!-- Page passes the container for the graph to the program -->
<body onload="main(document.getElementById('graphContainer'))">

  <!-- Creates a container for the graph with a grid wallpaper -->
  <div id="graphContainer"
    style="position:relative;overflow:hidden;width:321px;height:241px;background:url('editors/images/grid.gif');cursor:default;">
  </div>
</body>
</html>
