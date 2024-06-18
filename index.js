//npm init
//npm i express body-parser ejs pg
import express from 'express';
import bodyParser from 'body-parser';
import ejs from 'ejs';
import pg from 'pg';
import { error } from 'console';

const app = express();
const port = 3000;

//to serve static css pages from public folder
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }))


//database:
const db = new pg.Client({
    user: 'postgres',
    host: 'localhost',
    database: 'world',      //my db is named 'world'
    password: 'password',   //my password
    port: 5432
});

db.connect();   //start connection to db

let currentUserId = 0;      //initially no user exists
let usersList = [];

async function getUsers() {
    const result = await db.query("SELECT * FROM users");
    usersList = result.rows;

    //find user having currentUserId
    if (currentUserId === 0) {
        return null;
    }
    else {
        return usersList.find((user) => user.id == currentUserId);
    }

}

//maintain different visited countries-id(serial)   code(char)  user_id(int) references user_id
async function countryVisited() {
    let countrydb = [];       //stores our visited countries from db
    const result = await db.query("SELECT code FROM visited_countries AS vc JOIN users ON users.id=vc.user_id WHERE users.id=$1", [currentUserId]);
    for (var i = 0; i < result.rowCount; i++) {
        countrydb.push(result.rows[i].code);
    }
    return countrydb;
}

app.get('/', async (req, res) => {

    try {
        //get countries:
        let countrydb = []
        countrydb = await countryVisited();

        //get users:
        const currentUser = await getUsers();
        console.log("Current user is: ");
        console.log(currentUser);
        // console.log(currentUser.color);

        if (currentUser == null) {
            res.render('index.ejs', {
                // converts JavaScript objects (here array) into JSON string
                // console.log(JSON.stringify(countrydb));  [{"id":1,"code":"FR"},{"id":2,"code":"GB"},{"id":3,"code":"US"}]
                countryOutput: countrydb,
                totalCountriesSelected: countrydb.length,
                errorInput: 'Please create a member first! ',
                //if users exist then add:
                users: usersList,
                fillColor: null,
            });
        }
        else {
            res.render('index.ejs', {
                // converts JavaScript objects (here array) into JSON string
                // console.log(JSON.stringify(countrydb));  [{"id":1,"code":"FR"},{"id":2,"code":"GB"},{"id":3,"code":"US"}]
                countryOutput: countrydb,
                totalCountriesSelected: countrydb.length,

                //if users exist then add:
                users: usersList,
                fillColor: currentUser.color,
            });

        }


    } catch (err) {
        console.error("Some error occurred: ", err.stack);
    }


    //close connection:
    // db.end();
});

app.post("/submit", async (req, res) => {

    if (currentUserId === 0) {
        let countrydb = []
        res.render('index.ejs', {
            countryOutput: countrydb,
            totalCountriesSelected: countrydb.length,
            errorInput: 'Cannot insert without a member..create one first! ',
            fillColor: null,
        });
        return; //to stop execution
    }

    // console.log(req.body);  output:{ userInputCountry: 'spain' }
    // console.log(req.body.userInputCountry);         op:spain

    //convert inputs first letter to upper case & rest body to lowercase
    // console.log(req.body.userInputCountry.charAt(0).toUpperCase());
    // console.log(req.body.userInputCountry.slice(1).toLowerCase());

    //first split input where space occurs-- ie north_korea
    let userWords = req.body.userInputCountry.split(' ');
    // console.log(userWords); [ 'South', 'Korea' ] saves words in array

    let userInput = "";

    // let userFirstChar = req.body.userInputCountry.charAt(0).toUpperCase();
    // let userRemainChar = req.body.userInputCountry.slice(1).toLowerCase();
    // let userInput = userFirstChar.concat(userRemainChar);
    // console.log(userInput);

    for (var i = 0; i < userWords.length; i++) {
        userInput = userInput + userWords[i].charAt(0).toUpperCase() + userWords[i].slice(1).toLowerCase();
        if (i < userWords.length - 1) {
            userInput = userInput + " ";
        }
    }

    console.log(`Country entered by user is: ${userInput}`);

    //fetch country code corresponding to country name:
    const resultCode = await db.query("SELECT code FROM countries WHERE cname=$1", [userInput]);
    // const resultCode = await db.query("SELECT code FROM countries WHERE cname LIKE $1", [`%${userInput}%`]);

    if (resultCode.rowCount > 0) {
        console.log(resultCode.rows);        //output:[ { code: 'ES' } ]
        // console.log(resultCode.rows[0].code);   //as only 1 row is returned so index [0]

        const codeToInsert = resultCode.rows[0].code;
        // console.log(codeToInsert);

        //if already inserted then wrong
        const isVisited = db.query("SELECT code FROM visited_countries WHERE code=$1 AND user_id=$2", [codeToInsert, currentUserId]);

        if ((await isVisited).rowCount > 0) {
            //already visited
            const result = await db.query("SELECT code FROM visited_countries WHERE user_id=$1", [currentUserId]);
            let countrydb = []
            countrydb = await countryVisited();
            const currentUser = await getUsers();

            res.render("index.ejs", {
                countryOutput: countrydb,
                totalCountriesSelected: result.rowCount,
                errorInput: 'Country already visited! ',
                users: usersList,
                fillColor: currentUser.color,
            })
        }
        else {
            //new country query:

            //add this code to visited_countries table:
            const result = await db.query("INSERT INTO visited_countries(code,user_id) VALUES ($1,$2)", [codeToInsert, currentUserId]);
            res.redirect('/');
        }

    }
    else {
        const result = await db.query("SELECT code FROM visited_countries WHERE user_id=$1", [currentUserId]);

        console.log("No country found!")
        let countrydb = []
        countrydb = await countryVisited();
        const currentUser = await getUsers();
        res.render("index.ejs", {
            errorInput: 'Country name does not exist try again! ',
            totalCountriesSelected: result.rowCount,
            countryOutput: countrydb,
            users: usersList,
            fillColor: currentUser.color,
        });
        //change placeholder of input: Country name does not exist try again
    }


    // db.end();
});

//post request for new member creation
app.post("/newMember", function (req, res) {
    //if new member button is created then render new page

    //name=value (html pairs)
    if (req.body.newMem === "create") {
        res.render("newMember.ejs");
    }
    else {
        //else show countries ofcurrent user jispe click kiya hai
        // let currentUserId=1;
        currentUserId = req.body.userDeetail; //returns id as value

        console.log("\nUser clicked on a family member button with id= " + req.body.userDeetail);
        res.redirect("/");
    }
})

//post request for new user details:name+contact
app.post("/new", async (req, res) => {
    try {
        //store name n color choice in User database
        // console.log(req.body);

        //USE RETURNING KEYWORD :
        const result = await db.query("INSERT INTO users(name,color) VALUES ($1,$2) RETURNING *", [req.body.name, req.body.color])

        //get id of this user
        currentUserId = result.rows[0].id;

        console.log(`\nNew record inserted in users table here with id: ${result.rows[0].id}`);

        res.redirect("/");

    } catch (err) {
        console.error("Some error occurred: ", err.stack);
    }
})

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`)
})

// for serial datatype in postgre sql:

// delete from users;
// ALTER SEQUENCE public.users_id_seq RESTART WITH 1;
// insert into users(name,color) values ('Akshita','red');
// select * from users;


// CREATE TABLE users(
// 	id SERIAL,
// 	name VARCHAR(30),
// 	color VARCHAR(30),
// );
// CREATE TABLE visited_counties(
// 	id SERIAL,
// 	code VARCHAR(2),
// 	user_id INT REFERENCES user(id);
// );


//to view table:
// select * from visited_countries vc
// join users
// on users.id=vc.user_id
// join countries
// on vc.code=countries.code