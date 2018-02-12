import React from 'react';

export default class ChatPopup extends React.Component {
  render() {
    return (
      <div className="chat-popup">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-8">
              <span className="green">●</span> Chat (32)
            </div>
            <div className="col-md-4">
              <div className="btn-group pull-right" role="group">
                <button type="button" className="btn btn-xs">
                  <span className="glyphicon glyphicon-pencil"></span>
                </button>
                <button type="button" className="btn btn-xs">
                  <span className="glyphicon glyphicon-asterisk"></span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
