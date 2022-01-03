pub mod foo;
pub fn foo() {
    println!("foo!");
}

fn main() {
    // todo(simon): implement a test for parsing
    // fixme(simon): maybe clean this code up
    // bug(simon): possible bug description
    // feature(simon)!!!!: display the nota bene's in a nice list in vscode
    // feature(simon): Sort the items on the basis of TYPE * URGENCY. Also add UI pizazz so that it pops out, so the user can *intuitively* see the difference between NB's. This comment is particularly long to see that it gets truncated nicely in the tree view list.
    println!("This should not trigger todo, fixme, bug or feature_request");
}
