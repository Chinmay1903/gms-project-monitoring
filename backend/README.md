DB Script
create user usertest with NOINHERIT LOGIN ENCRYPTED PASSWORD 'usertest222';
create database dbtest owner=usertest;

--> How to run 
# uvicorn main:app --reload

--> Initialization of alembic
# python alembic init

--> How to make migration
# alembic revision --autogenerate -m "{name of the changes}"

--> How to migrate
# alembic upgrade head