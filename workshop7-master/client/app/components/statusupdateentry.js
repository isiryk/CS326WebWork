import React from 'react';
import {hideElement} from '../util';

export default class StatusUpdateEntry extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      // Value of the text entry box.
      value: "",
      // The image data as an data URI.
      // Contains the image as a base64'd string, prefixed by format information.
      // More info: https://en.wikipedia.org/wiki/Data_URI_scheme#Syntax
      imageUri: null
    };
  }

  /**
   * Called when the user clicks the 'post' button.
   * Triggers the `onPost` prop if the post isn't empty, and clears
   * the component.
   */
  handlePost(e) {
    // Prevent the event from "bubbling" up the DOM tree.
    e.preventDefault();
    // Trim whitespace from beginning + end of entry.
    var statusUpdateText = this.state.value.trim();
    if (statusUpdateText !== "") {
      // Tell parent about post.
      this.props.onPost(statusUpdateText, this.state.imageUri);
      // Reset status update.
      this.setState({value: "", imageUri: null});
    }
  }

  /**
   * Called when the user types a character into the status update box.
   * @param e An Event object.
   */
  handleChange(e) {
    // Prevent the event from "bubbling" up the DOM tree.
    e.preventDefault();
    // e.target is the React Virtual DOM target of the input event -- the
    // <textarea> element. The textarea's `value` is the entire contents of
    // what the user has typed in so far.
    this.setState({value: e.target.value});
  }
  
  /**
   * Called when the user selects a file to upload.
   */
  uploadImage(e) {
    e.preventDefault();

    // Read the first file that the user selected (if the user selected multiple
    // files, we ignore the others).
    var reader = new FileReader();
    var file = e.target.files[0];

    // Called once the browser finishes loading the image.
    reader.onload = (upload) => {
      this.setState({
        imageUri: upload.target.result
      });
    };

    // Tell the brower to read the image in as a data URL!
    reader.readAsDataURL(file);
  }
  
  /**
   * Tells the browser to request a file from the user.
   */
  triggerImageUpload(e) {
    e.preventDefault();
    // Click the input HTML element to trigger a file selection dialog.
    this.refs.file.click();
  }

  render() {
    return (
      <div className="fb-status-update-entry panel panel-default">
        <div className="panel-body">
          <ul className="nav nav-pills">
            <li role="presentation" className="active">
              <a href="#"><span className="glyphicon glyphicon-pencil"></span> <strong>Update Status</strong></a>
            </li>
            <li role="presentation">
              <a href="#"><span className="glyphicon glyphicon-picture"></span> <strong>Add Photos/Video</strong></a>
            </li>
            <li role="presentation">
              <a href="#"><span className="glyphicon glyphicon-th"></span> <strong>Create Photo Album</strong></a>
            </li>
          </ul>
          <div className="media">
            <div className="media-left media-top">
              PIC
            </div>
            <div className="media-body">
              <div className="form-group">
                <textarea className="form-control fb-status-update-edit-box" rows="2" placeholder="What's on your mind?" value={this.state.value} onChange={(e) => this.handleChange(e)} />
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col-md-12">
              { /*
                  Display a preview of the image, if the user selected one for upload.
                  width=100% means the image is always as wide as the statusupdateentry.
                  If we didn't add that, wide images would stretch beyond the entry box!
                 */ }
              <img className={hideElement(this.state.imageUri === null)} src={this.state.imageUri} style={{width: "100%"}} />
            </div>
          </div>
          <div className="row">
            <div className="col-md-6">
              <div className="btn-group" role="group">
                { /*
                    File upload in HTML is very clunky. It can only be accomplished
                    with a <input> element of type "file", which looks different in
                    every browser.
                    
                    The industry standard thing to do is to *hide* this ugly element, and
                    use a custom button to trigger it. User clicks on the camera button,
                    our JavaScript clicks on the input, and the browser asks the user to
                    upload a file.
                    
                    Isn't web development great?
                    
                    The following code was adapted from this StackOverflow post:
                    http://stackoverflow.com/a/16080910
                   */ }
                <div style={{
                    height: 0,
                    overflow: "hidden"
                }}>
                  {/*
                      The "ref" attribute tells React to make the raw DOM node accessible
                      via this.refs.file
                      
                      We need the raw DOM node so we can programmatically "click" on it.
                    */}
                  <input ref="file" type="file" name="file" accept=".jpg,.jpeg,.png,.gif" onChange={(e) => this.uploadImage(e)}/>
                </div>
                <button type="button" className="btn btn-default" onClick={(e) => this.triggerImageUpload(e)}>
                  <span className="glyphicon glyphicon-camera"></span>
                </button>
                <button type="button" className="btn btn-default">
                  <span className="glyphicon glyphicon-user"></span>
                </button>
                <button type="button" className="btn btn-default">
                  ☺
                </button>
                <button type="button" className="btn btn-default">
                  <span className="glyphicon glyphicon-pushpin"></span>
                </button>
              </div>
            </div>
            <div className="col-md-6">
              <div className="pull-right">
                <button type="button" className="btn btn-default">
                  <span className="glyphicon glyphicon-user"></span> Friends <span className="caret"></span>
                </button>
                <button type="button" className="btn btn-default" onClick={(e) => this.handlePost(e)}>
                  Post
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}
