import React from 'react';
import ReactDOM from 'react-dom';
import Feed from './components/feed';
import NavBar from './components/navbar';
import LeftSideBar from './components/leftsidebar';
import RightSideBar from './components/rightsidebar';
import ChatPopup from './components/chatpopup';
import FeedItem from './components/feeditem';
import {hideElement} from './util';
import {searchForFeedItems, deleteFeedItem, login, signup} from './server';
import {getUserId} from './credentials';
import { IndexRoute, Router, Route, hashHistory, Link } from 'react-router'
import ErrorBanner from './components/errorbanner';

/**
 * A landing page that contains a login form.
 */
class LandingPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      failedAttempt: false,
      submitted: false,
      email: "",
      password: ""
    };
  }
  
  handleEmailChange(e) {
    e.preventDefault();
    this.setState({
      email: e.target.value
    });
  }
  
  handlePasswordChange(e) {
    e.preventDefault();
    this.setState({
      password: e.target.value
    });
  }
  
  handleSignIn(e) {
    e.preventDefault();
    this.setState({
      submitted: true
    });
    login(this.state.email, this.state.password, (success) => {
      if (success) {
        this.setState({
          email: "",
          password: "",
          failedAttempt: false,
          submitted: false
        });
        // User logged in: navigate to /feed
        this.context.router.push({ pathname: "/feed" });
      } else {
        // Invalid password or email address. Display message to user.
        this.setState({
          failedAttempt: true,
          submitted: false
        });
      }
    })
  }
  
  render() {
    return (
      <div>
        <h2 className="form-signin-heading">Welcome to Facebook!</h2>
        <div className={"alert alert-danger " + hideElement(!this.state.failedAttempt)} role="alert"><strong>Invalid email address or password.</strong> Please try a different email address or password, and try logging in again.</div>
        <form className="form-signin" onSubmit={(evt) => evt.preventDefault()}>
          <h2 className="form-signin-heading">Please log in.</h2>
          <p>Not a member? <Link to={"/signup"}>Signup for free today!</Link></p>
          <label htmlFor="inputEmail" className="sr-only">Email address</label>
          <input disabled={this.state.submitted} type="email" id="inputEmail" className="form-control" placeholder="Email address" required autoFocus value={this.state.email} onChange={(e) => this.handleEmailChange(e)} />
          <label htmlFor="inputPassword" className="sr-only">Password</label>
          <input disabled={this.state.submitted} type="password" id="inputPassword" className="form-control" placeholder="Password" required value={this.state.password} onChange={(e) => this.handlePasswordChange(e)} />
          <button disabled={this.state.submitted} className="btn btn-lg btn-primary btn-block" type="button" onClick={(e) => this.handleSignIn(e)}>Sign in</button>
        </form>
      </div>
    )
  }
}

// Tell React-Router that LandingPage needs to use the router dynamically.
LandingPage.contextTypes = {
  router: React.PropTypes.object.isRequired
};

class SignupPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      name: "",
      email: "",
      password: "",
      submitted: false,
      failedAttempt: false
    };
  }
  
  handleChange(field, e) {
    e.preventDefault();
    var update = {};
    // If field is "email", this sets update.email.
    update[field] = e.target.value;
    this.setState(update);
  }
  
  handleSignup(e) {
    e.preventDefault();
    this.setState({
      submitted: true
    });
    signup(this.state.email, this.state.name, this.state.password, (success) => {
      if (success) {
        // User signed up. Now try to login.
        login(this.state.email, this.state.password, (success) => {
          if (success) {
            this.setState({
              name: "",
              email: "",
              submitted: false,
              failedAttempt: false
            });
            // User signed up and logged in: navigate to /feed
            this.context.router.push({ pathname: "/feed" });
          } else {
            // Sign up succeeded but login failed?? Something is wrong...
            // Give up and alert the user.
            /* global FacebookError */
            FacebookError("Unable to log in after signup. Please try logging in from the main page.");
          }
        });
      } else {
        this.setState({
          submitted: false,
          failedAttempt: true
        });
      }
    });
  }
  
  render() {
    return (<div>
      <div className={hideElement(!this.state.failedAttempt) + " alert alert-danger"} role="alert"><strong>Invalid account signup.</strong> It is possible that you already have an account with that particular email address.</div>
      <form className="form-signin" onSubmit={(evt) => evt.preventDefault()}>
        <h2 className="form-signin-heading">Create an Account</h2>
        <p>Already have an account? <Link to={"/"}>Log in here.</Link></p>
        <label htmlFor="inputEmail" className="sr-only">Email address</label>
        <input disabled={this.state.submitted} type="email" id="inputEmail" className="form-control" placeholder="Email address" required autoFocus value={this.state.email} onChange={(e) => this.handleChange("email", e)} />
        <label htmlFor="inputName" className="sr-only">Full Name</label>
        <input disabled={this.state.submitted} type="" id="inputName" className="form-control" placeholder="Full name, e.g. John Smith" required value={this.state.name} onChange={(e) => this.handleChange("name", e)} />
        <label htmlFor="inputPassword" className="sr-only">Password</label>
        <input disabled={this.state.submitted} type="password" id="inputPassword" className="form-control" placeholder="Password" required value={this.state.password} onChange={(e) => this.handleChange("password", e)} />
        <button disabled={this.state.submitted} className="btn btn-lg btn-primary btn-block" type="button" onClick={(e) => this.handleSignup(e)}>Create Account</button>
      </form>
    </div>);
  }
}

// Tell React-Router that SignupPage needs to use the router dynamically.
SignupPage.contextTypes = {
  router: React.PropTypes.object.isRequired
};

/**
 * A fake profile page.
 */
class ProfilePage extends React.Component {
  render() {
    return (
      <p>This is the profile page for a user with ID {this.props.params.id}.</p>
    );
  }
}

/**
 * The Feed page. We created a new component just to fix the userId at 4.
 */
class FeedPage extends React.Component {
  render() {
    var userId = getUserId();
    return <Feed user={userId} />;
  }
}

/**
 * Search results page.
 */
class SearchResultsPage extends React.Component {
  getSearchTerm() {
    // If there's no query input to this page (e.g. /foo instead of /foo?bar=4),
    // query may be undefined. We have to check for this, otherwise
    // JavaScript will throw an exception and die!
    var queryVars = this.props.location.query;
    var searchTerm = "";
    if (queryVars && queryVars.q) {
      searchTerm = queryVars.q;
      // Remove extraneous whitespace.
      searchTerm.trim();
    }
    return searchTerm;
  }
  
  render() {
    var searchTerm = this.getSearchTerm();
    // By using the searchTerm as the key, React will create a new
    // SearchResults component every time the search term changes.
    return (
      <SearchResults key={searchTerm} searchTerm={searchTerm} />
    );
  }
}

class SearchResults extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loaded: false,
      invalidSearch: false,
      results: []
    };
  }
  
  deleteFeedItem(id) {
    deleteFeedItem(id, () => {
      this.refresh();
    });
  }
  
  refresh() {
    var searchTerm = this.props.searchTerm;
    if (searchTerm !== "") {
      searchForFeedItems(searchTerm, (feedItems) => {
        this.setState({
          loaded: true,
          results: feedItems
        });
      });
    } else {
      this.setState({
        invalidSearch: true
      });
    }
  }
  
  componentDidMount() {
    this.refresh();
  }
  
  render() {
    return (
      <div>
        <h2>Search Results for {this.props.searchTerm}</h2>
        <div className={hideElement(this.state.loaded || this.state.invalidSearch)}>Search results are loading...</div>
        <div className={hideElement(!this.state.invalidSearch)}>Invalid search query.</div>
        <div className={hideElement(!this.state.loaded)}>
          <div>Found {this.state.results.length} results.</div>
          {
            this.state.results.map((feedItem) => {
              return (
                <FeedItem key={feedItem._id} data={feedItem} onDelete={() => this.deleteFeedItem(feedItem._id)} />
              )
            })
          }
        </div>
      </div>
    );
  }
}


/**
 * The primary component in our application. Handles the overall layout
 * of the page.
 * The Router will give it different child Components as the user clicks
 * around the application.
 */
class App extends React.Component {
  render() {
    // If there's no query input to this page (e.g. /foo instead of /foo?bar=4),
    // query may be undefined. We have to check for this, otherwise
    // JavaScript will throw an exception and die!
    var queryVars = this.props.location.query;
    var searchTerm = null;
    if (queryVars && queryVars.searchTerm) {
      searchTerm = queryVars.searchTerm;
    }
    return (
      <div>
        <NavBar searchTerm={searchTerm} />
        <div className="container">
          <div className="row">
            <div className="col-md-12">
              <ErrorBanner />
            </div>
          </div>
          <div className="row">
            <div className="col-md-2 fb-left-sidebar">
              <LeftSideBar />
            </div>
            <div className="col-md-7">
              {this.props.children}
            </div>
            <div className="col-md-3 fb-right-sidebar">
              <RightSideBar />
            </div>
          </div>
        </div>
        <ChatPopup />
      </div>
    )
  }
}

ReactDOM.render((
  <Router history={hashHistory}>
    <Route path="/" component={App}>
      {/* Show landing page at / */}
      <IndexRoute component={LandingPage} />
      <Route path="feed" component={FeedPage} />
      <Route path="signup" component={SignupPage} />
      <Route path="profile/:id" component={ProfilePage} />
      <Route path="search" component={SearchResultsPage} />
    </Route>
  </Router>
),document.getElementById('main_container'));
