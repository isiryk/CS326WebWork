import React from 'react';
import ResetDatabase from './resetdatabase';

export default class LeftSideBar extends React.Component {
  render() {
    return (
      <ul className="nav nav-pills nav-stacked">
        <li role="presentation"><a href="#">John Vilk</a></li>
        <li role="presentation"><a href="#"><span className="glyphicon glyphicon-pencil"></span> Edit Profile</a></li>
        <li role="presentation">FAVORITES</li>
        <li role="presentation" className="active"><a href="#"><span className="glyphicon glyphicon-list-alt"></span> News Feed</a></li>
        <li role="presentation"><a href="#"><span className="glyphicon glyphicon-comment"></span> Messages    <span className="badge pull-right">7</span></a></li>
        <li role="presentation"><a href="#"><span className="glyphicon glyphicon-calendar"></span> Events</a></li>
        <li role="presentation"><a href="#"><span className="glyphicon glyphicon-picture"></span> Photos</a></li>
        <li role="presentation"><a href="#"><span className="glyphicon glyphicon-gift"></span> Gifts</a></li>
        <li role="presentation"><a href="#"><span className="glyphicon glyphicon-bookmark"></span> Saved <span className="badge pull-right">2</span></a></li>
        <li role="presentation"><a href="#"><span className="glyphicon glyphicon-tags"></span> Sale Groups</a></li>
        <li role="presentation">PAGES</li>
        <li role="presentation"><a href="#"><span className="glyphicon glyphicon-plus"></span> Create Page</a></li>
        <li role="presentation"><a href="#"><span className="glyphicon glyphicon-signal"></span> Create Ad</a></li>
        <li role="presentation">GROUPS</li>
        <li role="presentation"><a href="#"><span className="glyphicon glyphicon-plus"></span> Create Group</a></li>
        <li role="presentation"><a href="#"><span className="glyphicon glyphicon-user"></span> New Groups</a></li>
        <li role="presentation">FRIENDS</li>
        <li role="presentation"><a href="#"><span className="glyphicon glyphicon-pushpin"></span> Amherst, MA</a></li>
        <li role="presentation">DEBUG</li>
        <li role="presentation">
          <ResetDatabase />
        </li>
      </ul>
    );
  }
}
