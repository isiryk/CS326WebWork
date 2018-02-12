import React from 'react';

export default class RightSideBar extends React.Component {
  render() {
    /**
     * If this were a full application, we would actually have a component
     * for Trending, Birthdays, Suggested Pages, etc!
     */
    return (
      <div>
        <div className="row">
          <div className="col-md-12">
            <a href="#" className="pull-right"><span className="glyphicon glyphicon-download-alt"></span></a>
          </div>
        </div>
        <div className="row">
          <div className="col-md-12">
            <span className="glyphicon glyphicon-gift"></span> <a href="#">Zak</a> and <a href="#">1 other</a>
          </div>
        </div>
        <div className="row">
          <div className="col-md-12 fb-trending">
            <div className="row">
              <div className="col-md-4 fb-trending-title">
                TRENDING
              </div>
              <div className="col-md-8">
                <ul className="nav nav-pills pull-right">
                  <li role="presentation" className="active">
                    <a href="#"><span className="glyphicon glyphicon-flash"></span></a>
                  </li>
                  <li role="presentation"><a href="#"><span className="glyphicon glyphicon-tower"></span></a></li>
                  <li role="presentation"><a href="#"><span className="glyphicon glyphicon-sunglasses"></span></a></li>
                  <li role="presentation"><a href="#"><span className="glyphicon glyphicon-record"></span></a></li>
                  <li role="presentation"><a href="#"><span className="glyphicon glyphicon-facetime-video"></span></a></li>
                </ul>
              </div>
            </div>
            <div className="row">
              <div className="col-md-12">
                <ul className="media-list">
                  <li className="media">
                    <div className="media-left media-top">
                      <span className="glyphicon glyphicon-flash"></span>
                    </div>
                    <div className="media-body">
                      <a href="#">George Lucas</a>: Filmmaker Criticizes New "Star Wars" Film and Direction of Franchise Under Disney
                    </div>
                  </li>
                  <li className="media">
                    <div className="media-left media-top">
                      <span className="glyphicon glyphicon-flash"></span>
                    </div>
                    <div className="media-body">
                      <a href="#">Super Smash Bros.</a>: Game Glitch Allows Players to Control 8 Characters With 1 Controller
                    </div>
                  </li>
                  <li className="media">
                    <div className="media-left media-top">
                      <span className="glyphicon glyphicon-flash"></span>
                    </div>
                    <div className="media-body">
                      <a href="#">Tuukka Rask</a>: Boston Bruins Player Debuts Goalie Mask for Winter Classic
                    </div>
                  </li>
                  <li className="media">
                    <div className="media-left media-top">
                      <span className="caret"></span>
                    </div>
                    <div className="media-body">
                      <a href="#">See More</a>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div className="row">
          <div className="col-md-12">
            <div className="row">
              <div className="col-md-8">
                SUGGESTED PAGES
              </div>
              <div className="col-md-4">
                <a href="#" className="pull-right">See All</a>
              </div>
            </div>
            <div className="row">
              <div className="col-md-12">
                <img src="img/falafel.jpg" width="100%" />
                <br /><a href="#">Pita Pocket's</a>
                <br /> Mediterranean Restaurant · 301 likes
                <br /><button type="button" className="btn btn-default"><span className="glyphicon glyphicon-thumbs-up"></span> Like Page</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
