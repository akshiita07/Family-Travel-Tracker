# Family-Travel-Tracker

The "Family Travel Tracker" is a web application that allows users to track and record the countries they have visited. The project is built using Node.js with the Express framework, EJS for templating, and PostgreSQL for the database. 

#### Folder Structure and Key Files

- **index.js**: Main server file.
- **public/**: Contains static files like CSS.
- **views/**: Contains EJS templates.

### Implementation Details

#### 1. Dependencies

First, the project initializes and installs necessary dependencies:

```bash
npm init
npm i express body-parser ejs pg
```

#### 2. Server Setup (index.js)

```javascript
import express from 'express';
import bodyParser from 'body-parser';
import ejs from 'ejs';
import pg from 'pg';

const app = express();
const port = 3000;

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

const db = new pg.Client({
    user: 'postgres',
    host: 'localhost',
    database: 'world',
    password: 'password',
    port: 5432
});

db.connect();
```

- **Express**: Sets up the server.
- **Body-Parser**: Parses incoming request bodies.
- **PostgreSQL**: Connects to the database.

#### 3. Database Configuration

```sql
CREATE TABLE users(
    id SERIAL,
    name VARCHAR(30),
    color VARCHAR(30)
);

CREATE TABLE visited_countries(
    id SERIAL,
    code VARCHAR(2),
    user_id INT REFERENCES users(id)
);
```

- **Users**: Stores user information.
- **Visited_Countries**: Tracks countries visited by users.

#### 4. Fetch Users and Countries (index.js)

```javascript
let currentUserId = 0;
let usersList = [];

async function getUsers() {
    const result = await db.query("SELECT * FROM users");
    usersList = result.rows;
    return currentUserId === 0 ? null : usersList.find(user => user.id == currentUserId);
}

async function countryVisited() {
    const result = await db.query("SELECT code FROM visited_countries WHERE user_id=$1", [currentUserId]);
    return result.rows.map(row => row.code);
}
```

- **getUsers()**: Fetches all users from the database.
- **countryVisited()**: Fetches countries visited by the current user.

#### 5. Routes (index.js)

```javascript
app.get('/', async (req, res) => {
    const currentUser = await getUsers();
    const countrydb = await countryVisited();
    res.render('index.ejs', {
        countryOutput: countrydb,
        totalCountriesSelected: countrydb.length,
        errorInput: currentUser ? '' : 'Please create a member first!',
        users: usersList,
        fillColor: currentUser ? currentUser.color : null,
    });
});

app.post("/submit", async (req, res) => {
    if (currentUserId === 0) {
        res.render('index.ejs', { errorInput: 'Cannot insert without a member..create one first!' });
    } else {
        const userInput = formatCountryName(req.body.userInputCountry);
        const resultCode = await db.query("SELECT code FROM countries WHERE cname=$1", [userInput]);
        if (resultCode.rowCount > 0) {
            await handleCountryInsertion(resultCode.rows[0].code, res);
        } else {
            res.render('index.ejs', { errorInput: 'Country name does not exist try again!' });
        }
    }
});
```

- **GET `/`**: Renders the main page.
- **POST `/submit`**: Handles country submission, ensuring a member exists first.

#### 6. New Member Handling

```javascript
app.post("/newMember", (req, res) => {
    if (req.body.newMem === "create") {
        res.render("newMember.ejs");
    } else {
        currentUserId = req.body.userDeetail;
        res.redirect("/");
    }
});

app.post("/new", async (req, res) => {
    const result = await db.query("INSERT INTO users(name,color) VALUES ($1,$2) RETURNING *", [req.body.name, req.body.color]);
    currentUserId = result.rows[0].id;
    res.redirect("/");
});
```

- **POST `/newMember`**: Renders the new member creation page.
- **POST `/new`**: Inserts a new user into the database and sets it as the current user.

### Additional Helper Functions

```javascript
function formatCountryName(input) {
    return input.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
}

async function handleCountryInsertion(code, res) {
    const isVisited = await db.query("SELECT code FROM visited_countries WHERE code=$1 AND user_id=$2", [code, currentUserId]);
    if (isVisited.rowCount > 0) {
        res.render('index.ejs', { errorInput: 'Country already visited!' });
    } else {
        await db.query("INSERT INTO visited_countries(code,user_id) VALUES ($1,$2)", [code, currentUserId]);
        res.redirect('/');
    }
}
```

- **formatCountryName**: Formats the country name to proper case.
- **handleCountryInsertion**: Handles the logic for inserting a new visited country, including duplicate checks.

### Conclusion

The "Family Travel Tracker" provides a straightforward yet functional approach to tracking travel history for multiple users, leveraging a clean MVC structure with Express, EJS, and PostgreSQL. The full implementation details, including error handling and additional functionalities, can be explored in the repository. For more information, visit the [Family Travel Tracker repository](https://github.com/akshiita07/Family-Travel-Tracker).
