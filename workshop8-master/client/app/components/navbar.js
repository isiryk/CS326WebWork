import SearchBar from './searchbar';
import React from 'react';
import {logout, getUserFullName} from '../credentials';

export default class Navbar extends React.Component {
  onLogOutClick(e) {
    e.preventDefault();
    logout();
    // User logged out. Redirect to /, which has the signin page.
    this.context.router.push({ pathname: "/" });
  }
  
  render() {
    // Get the user's first name.
    var name = getUserFullName();
    if (name) {
      var spaceIdx = name.indexOf(" ");
      name = name.slice(0, spaceIdx);
    } else {
      name = "";
    }
    return (
      <nav className="navbar navbar-default navbar-fixed-top">
       <div className="container">
         <div className="navbar-header">
           <button type="button" className="navbar-toggle collapsed" data-toggle="collapse" data-target="#bs-example-navbar-collapse-1" aria-expanded="false">
             <span className="sr-only">Toggle navigation</span>
             <span className="icon-bar"></span>
             <span className="icon-bar"></span>
             <span className="icon-bar"></span>
           </button>
           <a className="navbar-brand" href="#">
             <span className="glyphicon glyphicon-home"></span>
           </a>
         </div>
         <div className="collapse navbar-collapse" id="bs-example-navbar-collapse-1">
           <SearchBar searchTerm={this.props.searchTerm} />
           <div className="nav navbar-nav navbar-right">
             <div className="btn-toolbar pull-right" role="toolbar">
               <div className="btn-group" role="group">
                 <button type="button" className="btn btn-default navbar-btn">
                   {name}
                 </button>
               </div>
               <div className="btn-group" role="group">
                 <button type="button" className="btn btn-default navbar-btn">
                   Home
                 </button>
               </div>
               <div className="btn-group" role="group">
                 <button type="button" className="btn btn-default navbar-btn fb-notifications">
                   <span className="glyphicon glyphicon-user"></span>
                   <span className="badge">5</span>
                 </button>
                 <button type="button" className="btn btn-default navbar-btn fb-notifications">
                   <span className="glyphicon glyphicon-comment"></span>
                   <span className="badge">1</span>
                 </button>
                 <button type="button" className="btn btn-default navbar-btn fb-notifications">
                   <span className="glyphicon glyphicon-globe"></span>
                   <span className="badge">3</span>
                 </button>
               </div>
               <div className="btn-group" role="group">
                 <button type="button" className="btn btn-default navbar-btn">
                   <span className="glyphicon glyphicon-lock"></span>
                 </button>
                 <div className="btn-group" role="group">
                   <button type="button" className="btn btn-default dropdown-toggle navbar-btn" data-toggle="dropdown">
                     <span className="caret"></span>
                   </button>
                   <ul className="dropdown-menu">
                     <li><a onClick={(e) => this.onLogOutClick(e)}>Log out...</a></li>
                   </ul>
                 </div>
               </div>
             </div>
           </div>
         </div>
       </div>
     </nav>
    )
  }
}

// Tell React-Router that Navbar needs to use the router dynamically.
Navbar.contextTypes = {
  router: React.PropTypes.object.isRequired
};
