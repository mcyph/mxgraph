import mxgraph from '@mxgraph/core';

import { globalTypes } from '../.storybook/preview';

export default {
  title: 'Layouts/AutoLayout',
  argTypes: {
    ...globalTypes,
    contextMenu: {
      type: 'boolean',
      defaultValue: false
    },
    rubberBand: {
      type: 'boolean',
      defaultValue: true
    }
  }
};

const Template = ({ label, ...args }) => {
  const {
    mxGraph,
    mxRubberband,
    mxEvent,
    mxUtils,
    mxCellRenderer,
    mxEdgeHandler,
    mxHierarchicalLayout,
    mxConstants,
    mxCellOverlay,
    mxImage,
    mxClient,
    mxMorphing,
    mxEventObject,
    mxEventUtils
  } = mxgraph;

  const container = document.createElement('div');
  container.style.position = 'relative';
  container.style.overflow = 'hidden';
  container.style.width = `${args.width}px`;
  container.style.height = `${args.height}px`;
  container.style.background = 'url(/images/grid.gif)';
  container.style.cursor = 'default';

  if (!args.contextMenu)
    mxEvent.disableContextMenu(container);

  class MyCustomCellRenderer extends mxCellRenderer {
    installCellOverlayListeners(state, overlay, shape) {
      super.installCellOverlayListeners(state, overlay, shape);

      mxEvent.addListener(
        shape.node,
        mxClient.IS_POINTER ? 'pointerdown' : 'mousedown',
        evt => {
          overlay.fireEvent(
            new mxEventObject('pointerdown', 'event', evt, 'state', state)
          );
        }
      );

      if (!mxClient.IS_POINTER && mxClient.IS_TOUCH) {
        mxEvent.addListener(shape.node, 'touchstart', evt => {
          overlay.fireEvent(
            new mxEventObject('pointerdown', 'event', evt, 'state', state)
          );
        });
      }
    }
  }

  class MyCustomEdgeHandler extends mxEdgeHandler {
    connect(edge, terminal, isSource, isClone, me) {
      super.connect(edge, terminal, isSource, isClone, me);
      executeLayout();
    }
  }

  class MyCustomGraph extends mxGraph {
    createEdgeHandler(state, edgeStyle) {
      return new MyCustomEdgeHandler(state, edgeStyle);
    }

    createCellRenderer() {
      return new MyCustomCellRenderer();
    }
  }

  // Creates the graph inside the given this.el
  const graph = new MyCustomGraph(container);
  graph.setPanning(true);
  graph.panningHandler.useLeftButtonForPanning = true;
  graph.setAllowDanglingEdges(false);
  graph.connectionHandler.select = false;
  graph.view.setTranslate(20, 20);

  // Enables rubberband selection
  if (args.rubberBand)
    new mxRubberband(graph);

  // Gets the default parent for inserting new cells. This
  // is normally the first child of the root (ie. layer 0).
  const parent = graph.getDefaultParent();

  const layout = new mxHierarchicalLayout(graph, mxConstants.DIRECTION_WEST);

  let v1;
  const executeLayout = (change, post) => {
    graph.getModel().beginUpdate();
    try {
      if (change != null) {
        change();
      }
      layout.execute(graph.getDefaultParent(), v1);
    } catch (e) {
      throw e;
    } finally {
      // New API for animating graph layout results asynchronously
      const morph = new mxMorphing(graph);
      morph.addListener(mxEvent.DONE, () => {
        graph.getModel().endUpdate();
        if (post != null) {
          post();
        }
      });
      morph.startAnimation();
    }
  };

  const addOverlay = cell => {
    // Creates a new overlay with an image and a tooltip
    const overlay = new mxCellOverlay(
      new mxImage('images/add.png', 24, 24),
      'Add outgoing'
    );
    overlay.cursor = 'hand';

    // Installs a handler for clicks on the overlay
    overlay.addListener(mxEvent.CLICK, (sender, evt2) => {
      graph.clearSelection();
      const geo = graph.getCellGeometry(cell);

      let v2;

      executeLayout(
        () => {
          v2 = graph.insertVertex({
            parent,
            value: 'World!',
            position: [geo.x, geo.y],
            size: [80, 30],
          });
          addOverlay(v2);
          graph.view.refresh(v2);
          const e1 = graph.insertEdge({
            parent,
            source: cell,
            target: v2,
          });
        },
        () => {
          graph.scrollCellToVisible(v2);
        }
      );
    });

    // Special CMS event
    overlay.addListener('pointerdown', (sender, eo) => {
      const evt2 = eo.getProperty('event');
      const state = eo.getProperty('state');

      graph.popupMenuHandler.hideMenu();
      graph.stopEditing(false);

      const pt = mxUtils.convertPoint(
        graph.container,
        mxEventUtils.getClientX(evt2),
        mxEventUtils.getClientY(evt2)
      );
      graph.connectionHandler.start(state, pt.x, pt.y);
      graph.isMouseDown = true;
      graph.isMouseTrigger = mxEventUtils.isMouseEvent(evt2);
      mxEvent.consume(evt2);
    });

    // Sets the overlay for the cell in the graph
    graph.addCellOverlay(cell, overlay);
  };

  // Adds cells to the model in a single step
  graph.batchUpdate(() => {
    v1 = graph.insertVertex({
      parent,
      value: 'Hello,',
      position: [0, 0],
      size: [80, 30],
    });
    addOverlay(v1);
  });

  graph.resizeCell = function() {
    mxGraph.prototype.resizeCell.apply(this, arguments);
    executeLayout();
  };

  graph.connectionHandler.addListener(mxEvent.CONNECT, function() {
    executeLayout();
  });

  return container;
}

export const Default = Template.bind({});