import mxgraph from '@mxgraph/core';

import { globalTypes } from '../.storybook/preview';

export default {
  title: 'Misc/Monitor',
  argTypes: {
    ...globalTypes
  }
};

const Template = ({ label, ...args }) => {
  const {
    mxGraph,
    mxEdgeStyle,
    mxDomHelpers,
    mxXmlUtils,
    mxPerimeter,
    mxUtils,
    mxConstants,
    mxCloneUtils,
    mxCodec
  } = mxgraph;

  const div = document.createElement('div');

  const container = document.createElement('div');
  container.style.position = 'relative';
  container.style.overflow = 'hidden';
  container.style.width = `${args.width}px`;
  container.style.height = `${args.height}px`;
  container.style.background = 'url(/images/grid.gif)';
  container.style.cursor = 'default';
  div.appendChild(container);

  mxConstants.SHADOWCOLOR = '#e0e0e0';

  // Creates the graph inside the given container
  const graph = createGraph(container);

  // Creates a process display using the activity names as IDs to refer to the elements
  const xml =
    '<Transactions><root><mxCell id="0"/><mxCell id="1" parent="0"/>' +
    '<mxCell id="2" value="Claim Handling Process" style="swimlane" vertex="1" parent="1"><mxGeometry x="1" width="850" height="400" as="geometry"/></mxCell>' +
    '<mxCell id="3" value="Claim Manager" style="swimlane" vertex="1" parent="2"><mxGeometry x="30" width="820" height="200" as="geometry"/></mxCell>' +
    '<mxCell id="5" value="" style="start" vertex="1" parent="3"><mxGeometry x="40" y="85" width="30" height="30" as="geometry"/></mxCell>' +
    '<mxCell id="AuthorizeClaim" value="Authorize&#xa;Claim" vertex="1" parent="3"><mxGeometry x="90" y="80" width="100" height="40" as="geometry"/></mxCell>' +
    '<mxCell id="6" value="X" style="step" vertex="1" parent="3"><mxGeometry x="210" y="85" width="30" height="30" as="geometry"/></mxCell>' +
    '<mxCell id="ApproveClaim" value="Approve&#xa;Claim" vertex="1" parent="3"><mxGeometry x="260" y="80" width="100" height="40" as="geometry"/></mxCell>' +
    '<mxCell id="7" value="X" style="step" vertex="1" parent="3"><mxGeometry x="380" y="85" width="30" height="30" as="geometry"/></mxCell>' +
    '<mxCell id="8" value="" edge="1" parent="3" source="5" target="AuthorizeClaim"><mxGeometry relative="1" as="geometry"/></mxCell>' +
    '<mxCell id="9" value="" edge="1" parent="3" source="AuthorizeClaim" target="6"><mxGeometry relative="1" as="geometry"/></mxCell>' +
    '<mxCell id="10" value="" edge="1" parent="3" source="6" target="ApproveClaim"><mxGeometry relative="1" as="geometry"/></mxCell>' +
    '<mxCell id="11" value="" edge="1" parent="3" source="ApproveClaim" target="7"><mxGeometry relative="1" as="geometry"/></mxCell>' +
    '<mxCell id="12" value="" edge="1" parent="3" source="7" target="AuthorizeClaim"><mxGeometry relative="1" as="geometry"><Array as="points"><mxPoint x="140" y="40"/></Array></mxGeometry></mxCell>' +
    '<mxCell id="ReviewClaim" value="Review&#xa;Claim" vertex="1" parent="3"><mxGeometry x="480" y="80" width="100" height="40" as="geometry"/></mxCell>' +
    '<mxCell id="22" value="X" style="step" vertex="1" parent="3"><mxGeometry x="600" y="85" width="30" height="30" as="geometry"/></mxCell>' +
    '<mxCell id="23" value="" edge="1" parent="3" source="ReviewClaim" target="22"><mxGeometry relative="1" as="geometry"/></mxCell>' +
    '<mxCell id="ApproveReviewedClaim" value="Approve Rev.&#xa;Claim" vertex="1" parent="3"><mxGeometry x="650" y="80" width="100" height="40" as="geometry"/></mxCell>' +
    '<mxCell id="26" value="" edge="1" parent="3" source="22" target="ApproveReviewedClaim"><mxGeometry relative="1" as="geometry"/></mxCell>' +
    '<mxCell id="27" value="X" style="step" vertex="1" parent="3"><mxGeometry x="770" y="85" width="30" height="30" as="geometry"/></mxCell>' +
    '<mxCell id="28" value="" edge="1" target="27" parent="3" source="ApproveReviewedClaim"><mxGeometry relative="1" as="geometry"><mxPoint x="740" y="100" as="sourcePoint"/><mxPoint x="760" y="100" as="targetPoint"/></mxGeometry></mxCell>' +
    '<mxCell id="32" value="" edge="1" parent="3" source="27" target="ReviewClaim"><mxGeometry relative="1" as="geometry"><Array as="points"><mxPoint x="665" y="160"/></Array></mxGeometry></mxCell>' +
    '<mxCell id="4" value="Accountant" style="swimlane" vertex="1" parent="2"><mxGeometry x="30" y="200" width="820" height="200" as="geometry"/></mxCell>' +
    '<mxCell id="EnterAccountingData" value="Enter&#xa;Data" vertex="1" parent="4"><mxGeometry x="430" y="80" width="100" height="40" as="geometry"/></mxCell>' +
    '<mxCell id="14" value="X" style="step" vertex="1" parent="4"><mxGeometry x="550" y="85" width="30" height="30" as="geometry"/></mxCell>' +
    '<mxCell id="15" value="" edge="1" parent="4" source="EnterAccountingData" target="14"><mxGeometry relative="1" as="geometry"/></mxCell>' +
    '<mxCell id="CheckAccountingData" value="Check&#xa;Data" vertex="1" parent="4"><mxGeometry x="600" y="80" width="100" height="40" as="geometry"/></mxCell>' +
    '<mxCell id="16" value="" edge="1" parent="4" source="14" target="CheckAccountingData"><mxGeometry relative="1" as="geometry"/></mxCell>' +
    '<mxCell id="17" value="X" style="step" vertex="1" parent="4"><mxGeometry x="720" y="85" width="30" height="30" as="geometry"/></mxCell>' +
    '<mxCell id="18" value="" edge="1" parent="4" source="CheckAccountingData" target="17"><mxGeometry relative="1" as="geometry"/></mxCell>' +
    '<mxCell id="19" value="" style="end" vertex="1" parent="4"><mxGeometry x="770" y="85" width="30" height="30" as="geometry"/></mxCell>' +
    '<mxCell id="20" value="" edge="1" parent="4" source="17" target="19"><mxGeometry relative="1" as="geometry"/></mxCell>' +
    '<mxCell id="31" value="" edge="1" parent="4" source="17" target="EnterAccountingData"><mxGeometry relative="1" as="geometry"><Array as="points"><mxPoint x="625" y="160"/></Array></mxGeometry></mxCell>' +
    '<mxCell id="13" value="" edge="1" parent="2" source="7" target="EnterAccountingData"><mxGeometry relative="1" as="geometry"/></mxCell>' +
    '<mxCell id="24" value="" edge="1" parent="2" source="14" target="ReviewClaim" style="edgeStyle=none"><mxGeometry relative="1" as="geometry"><Array as="points"><mxPoint x="595" y="180"/><mxPoint x="480" y="180"/><mxPoint x="480" y="100"/></Array></mxGeometry></mxCell>' +
    '<mxCell id="29" value="" edge="1" parent="2" source="22" target="EnterAccountingData"><mxGeometry relative="1" as="geometry"><Array as="points"><mxPoint x="469" y="40"/></Array></mxGeometry></mxCell>' +
    '<mxCell id="30" value="" edge="1" parent="2" source="27" target="EnterAccountingData"><mxGeometry relative="1" as="geometry"><Array as="points"><mxPoint x="469" y="40"/></Array></mxGeometry></mxCell>' +
    '<mxCell id="33" value="" edge="1" parent="2" source="6" target="EnterAccountingData"><mxGeometry relative="1" as="geometry"><Array as="points"><mxPoint x="255" y="200"/></Array></mxGeometry></mxCell>' +
    '</root></Transactions>';
  const doc = mxXmlUtils.parseXml(xml);
  const codec = new mxCodec(doc);
  codec.decode(doc.documentElement, graph.getModel());

  const buttons = document.createElement('div');
  div.appendChild(buttons);

  // Creates a button to invoke the refresh function
  buttons.appendChild(
    mxDomHelpers.button('Update', function(evt) {
      // XML is normally fetched from URL at server using mxUtils.get - this is a client-side
      // string with randomized states to demonstrate the idea of the workflow monitor
      const xml =
        `<process><update id="ApproveClaim" state="${getState()}"/><update id="AuthorizeClaim" state="${getState()}"/>` +
        `<update id="CheckAccountingData" state="${getState()}"/><update id="ReviewClaim" state="${getState()}"/>` +
        `<update id="ApproveReviewedClaim" state="${getState()}"/><update id="EnterAccountingData" state="${getState()}"/></process>`;
      update(graph, xml);
    })
  );

  /**
   * Updates the display of the given graph using the XML data
   */
  function update(graph, xml) {
    if (xml != null && xml.length > 0) {
      const doc = mxXmlUtils.parseXml(xml);

      if (doc != null && doc.documentElement != null) {
        const model = graph.getModel();
        const nodes = doc.documentElement.getElementsByTagName('update');

        if (nodes != null && nodes.length > 0) {
          model.beginUpdate();

          try {
            for (let i = 0; i < nodes.length; i++) {
              // Processes the activity nodes inside the process node
              const id = nodes[i].getAttribute('id');
              const state = nodes[i].getAttribute('state');

              // Gets the cell for the given activity name from the model
              const cell = model.getCell(id);

              // Updates the cell color and adds some tooltip information
              if (cell != null) {
                // Resets the fillcolor and the overlay
                graph.setCellStyles('fillColor', 'white', [
                  cell,
                ]);
                graph.removeCellOverlays(cell);

                // Changes the cell color for the known states
                if (state == 'Running') {
                  graph.setCellStyles(
                    'fillColor',
                    '#f8cecc',
                    [cell]
                  );
                } else if (state == 'Waiting') {
                  graph.setCellStyles(
                    'fillColor',
                    '#fff2cc',
                    [cell]
                  );
                } else if (state == 'Completed') {
                  graph.setCellStyles(
                    'fillColor',
                    '#d4e1f5',
                    [cell]
                  );
                }

                // Adds tooltip information using an overlay icon
                if (state != 'Init') {
                  // Sets the overlay for the cell in the graph
                  graph.addCellOverlay(
                    cell,
                    createOverlay(graph.warningImage, `State: ${state}`)
                  );
                }
              }
            } // for
          } finally {
            model.endUpdate();
          }
        }
      }
    }
  }

  /**
   * Creates an overlay object using the given tooltip and text for the alert window
   * which is being displayed on click.
   */
  function createOverlay(image, tooltip) {
    const overlay = new CellOverlay(image, tooltip);

    // Installs a handler for clicks on the overlay
    overlay.addListener(mxEvent.CLICK, function(sender, evt) {
      mxUtils.alert(`${tooltip}\nLast update: ${new Date()}`);
    });

    return overlay;
  }

  /**
   * Creates and returns an empty graph inside the given container.
   */
  function createGraph(container) {
    const graph = new mxGraph(container);
    graph.setTooltips(true);
    graph.setEnabled(false);

    // Disables folding
    graph.isCellFoldable = function(cell, collapse) {
      return false;
    };

    // Creates the stylesheet for the process display
    let style = graph.getStylesheet().getDefaultVertexStyle();
    style.fontSize = 11;
    style.fontColor = 'black';
    style.strokeColor = '#808080';
    style.fillColor = 'white';
    style.gradientColor = 'white';
    style.gradientDirection = mxConstants.DIRECTION_EAST;
    style.rounded = true;
    style.shadow = true;
    style.fontStyle = 1;

    style = graph.getStylesheet().getDefaultEdgeStyle();
    style.edge = mxEdgeStyle.ElbowConnector;
    style.strokeColor = '#808080';
    style.rounded = true;
    style.shadow = true;

    style = [];
    style.shape = mxConstants.SHAPE_SWIMLANE;
    style.perimiter = mxPerimeter.RectanglePerimeter;
    style.strokeColor = '#a0a0a0';
    style.fontColor = '#606060';
    style.fillColor = '#E0E0DF';
    style.gradientColor = 'white';
    style.startSize = 30;
    style.rounded = false;
    style.fontSize = 12;
    style.fontStyle = 0;
    style.horizontal = false;
    // To improve text quality for vertical labels in some old IE versions...
    style.labelBackgroundColor = '#efefef';

    graph.getStylesheet().putCellStyle('swimlane', style);

    style = [];
    style.shape = mxConstants.SHAPE_RHOMBUS;
    style.perimiter = mxPerimeter.RhombusPerimeter;
    style.strokeColor = '#91BCC0';
    style.fontColor = 'gray';
    style.fillColor = '#91BCC0';
    style.gradientColor = 'white';
    style.align = mxConstants.ALIGN_CENTER;
    style.verticalAlign = mxConstants.ALIGN_MIDDLE;
    style.fontSize = 16;
    graph.getStylesheet().putCellStyle('step', style);

    style = [];
    style.shape = mxConstants.SHAPE_ELLIPSE;
    style.perimiter = mxPerimeter.EllipsePerimeter;
    style.fontColor = 'gray';
    style.fillColor = '#A0C88F';
    style.gradientColor = 'white';
    style.strokeColor = '#A0C88F';
    style.align = mxConstants.ALIGN_CENTER;
    style.verticalAlign = mxConstants.ALIGN_MIDDLE;
    style.fontSize = 16;
    graph.getStylesheet().putCellStyle('start', style);

    style = mxCloneUtils.clone(style);
    style.fillColor = '#DACCBC';
    style.strokeColor = '#AF7F73';
    graph.getStylesheet().putCellStyle('end', style);

    return graph;
  }

  /**
   * Returns a random state.
   */
  function getState() {
    let state = 'Init';
    const rnd = Math.random() * 4;

    if (rnd > 3) {
      state = 'Completed';
    } else if (rnd > 2) {
      state = 'Running';
    } else if (rnd > 1) {
      state = 'Waiting';
    }

    return state;
  }

  return div;
}

export const Default = Template.bind({});