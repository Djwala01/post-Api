const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const format = require('date-fns/format')
const isValid = require('date-fns/isValid')
const app = express()
app.use(express.json())

const dbPath = path.join(__dirname, 'todoApplication.db')

let db = null

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}

initializeDBAndServer()

const convert = each => {
  return {
    id: each.id,
    todo: each.todo,
    priority: each.priority,
    status: each.status,
    category: each.category,
    dueDate: each.due_date,
  }
}

//API 1

const getStatus = requestQuery => {
  return requestQuery.status !== undefined
}

const getPriority = requestQuery => {
  return requestQuery.priority !== undefined
}

const getStatusPriority = requestQuery => {
  return requestQuery.status && requestQuery.priority !== undefined
}

const getSearch = requestQuery => {
  return requestQuery.search_q !== undefined
}

const getCategoryStatus = requestQuery => {
  return requestQuery.category && requestQuery.status !== undefined
}

const getCategory = requestQuery => {
  return requestQuery.category !== undefined
}

const getCategoryPriority = requestQuery => {
  return requestQuery.category && requestQuery.priority !== undefined
}

app.get('/todos/', async (request, response) => {
  let data = null
  let getQuery = ''
  const {status, priority, search_q, category} = request.query

  switch (true) {
    case getStatusPriority(request.query):
      getQuery = `select * from todo where status="${status}" and priority="${priority}"`
      break

    case getCategoryStatus(request.query):
      getQuery = `select * from todo where category="${category}" and status="${status}"`
      break

    case getCategoryPriority(request.query):
      getQuery = `select * from todo where category="${category}" and priority="${priority}"`
      break

    case getStatus(request.query):
      if (status !== 'TO DO') {
        response.status(400)
        response.send('Invalid Todo Status')
        return
      } else {
        getQuery = `select * from todo where status="${status}"`
      }
      break

    case getSearch(request.query):
      getQuery = `select * from todo where todo like "%${search_q}%"`
      break

    case getPriority(request.query):
      if (request.query.priority !== 'HIGH') {
        response.status(400)
        response.send('Invalid Todo Priority')
        return
      } else {
        getQuery = `select * from todo where priority="${priority}"`
      }
      break

    case getCategory(request.query):
      if (request.query.category !== 'HOME') {
        response.status(400)
        response.send('Invalid Todo Category')
        return
      } else {
        getQuery = `select * from todo where category="${category}"`
      }
      break
  }

  data = await db.all(getQuery)
  response.send(data.map(each => convert(each)))
})

//API 2

app.get('/todos/:todoId', async (request, response) => {
  const {todoId} = request.params
  const getQuery = `SELECT * FROM todo WHERE id=${todoId}`
  const result = await db.get(getQuery)
  response.send(convert(result))
})

//API 3

app.get('/agenda/', async (request, response) => {
  const {date} = request.query
  const isValidDate = isValid(new Date(date))
  if (isValidDate === false) {
    response.status(400)
    response.send('Invalid Due Date')
    return
  }
  const reference = format(new Date(date), 'yyyy-MM-dd')
  const Query = `select id,todo,category,priority,status,due_date as dueDate from todo
  where due_date="${reference}"`
  const final = await db.all(Query)
  response.send(final)
})

//API 4

app.post('/todos/', async (request, response) => {
  const {id, todo, priority, status, category, dueDate} = request.body
  const priorityArray = ['HIGH', 'MEDIUM', 'LOW']
  const priorityIsInArray = priorityArray.includes(priority)
  const statusArray = ['TO DO', 'IN PROGRESS', 'DONE']
  const statusIsInArray = statusArray.includes(status)
  const categoryArray = ['WORK', 'HOME', 'LEARNING']
  const categoryIsInArray = categoryArray.includes(category)
  if (priorityIsInArray === false) {
    response.status(400)
    response.send('Invalid Todo Priority')
    return
  }

  if (statusIsInArray === false) {
    response.status(400)
    response.send('Invalid Todo Status')
    return
  }

  if (categoryIsInArray === false) {
    response.status(400)
    response.send('Invalid Todo Category')
    return
  } 

  const isValidDate = isValid(new Date(dueDate))
  if (isValidDate === false) {
    response.status(400)
    response.send('Invalid Due Date')
    return;
  }
  
  else {
    const postQuery = `insert into todo(id,todo,priority,status,category,due_date)
    values(${id},"${todo}","${priority}","${status}","${category}","${dueDate}")`
    await db.run(postQuery)
    response.send('Todo Successfully Added')
  }
})

//API 5

const putStatus = requestBody => {
  return requestBody.status !== undefined
}

const putPriority = requestBody => {
  return requestBody.priority !== undefined
}

const putTodo = requestBody => {
  return requestBody.todo !== undefined
}

const putCategory = requestBody => {
  return requestBody.category !== undefined
}

const putDate = requestBody => {
  return requestBody.dueDate !== undefined
}

app.put('/todos/:todoId', async (request, response) => {
  let data = null
  let putQuery
  let updateColumn = ''
  const {todoId} = request.params
  const {status, priority, todo, category, dueDate} = request.body

  switch (true) {
    case putStatus(request.body):
      const statusArray = ['TO DO', 'IN PROGRESS', 'DONE']
      const statusIsInArray = statusArray.includes(status)
      if (statusIsInArray === true) {
        putQuery = `update todo
      set status="${status}"
      where id=${todoId}`
        updateColumn = 'Status'
      } else {
        response.status(400)
        response.send('Invalid Todo Status')
        return
      }
      break

    case putPriority(request.body):
      const priorityArray = ['HIGH', 'MEDIUM', 'LOW']
      const priorityIsInArray = priorityArray.includes(priority)
      if (priorityIsInArray === true) {
        putQuery = `update todo
      set priority="${priority}"
      where id=${todoId}`
        updateColumn = 'Priority'
      } else {
        response.status(400)
        response.send('Invalid Todo Priority')
        return
      }
      break

    case putTodo(request.body):
      putQuery = `update todo
    set todo="${todo}"
    where id=${todoId}`
      updateColumn = 'Todo'
      break

    case putCategory(request.body):
      const categoryArray = ['WORK', 'HOME', 'LEARNING']
      const categoryIsInArray = categoryArray.includes(category)
      if (categoryIsInArray === true) {
        putQuery = `update todo
      set category="${category}"
      where id=${todoId}`
        updateColumn = 'Category'
      } else {
        response.status(400)
        response.send('Invalid Todo Category')
        return
      }
      break

    case putDate(request.body):
    const isValidDate = isValid(new Date(dueDate))
    if (isValidDate === false) {
      response.status(400)
      response.send('Invalid Due Date')
      return;
  }
      putQuery = `update todo
    set due_date="${dueDate}"
    where id=${todoId}`
      updateColumn = 'Due Date'
      break
  }

  data = await db.run(putQuery)
  response.send(`${updateColumn} Updated`)
})

//API 6

app.delete('/todos/:todoId', async (request, response) => {
  const {todoId} = request.params
  const deleteQuery = `delete from todo where id=${todoId}`
  await db.run(deleteQuery)
  response.send('Todo Deleted')
})

module.exports = app
