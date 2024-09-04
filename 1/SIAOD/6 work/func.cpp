// void  pushAeroflot  ( struct Aeroflot const aer ) {
//     struct node * tmp = malloc  ( sizeof (  struct node ) ) ;
//     tmp ->  flight  = aer ;
//     // ---
//     struct node* prevcurrent = NULL ;
//     struct node* current;
//     current = first;
//     int const fn = tmp->flight.flightNumber ;
//     while (current) {
//         if (current->flight.flightNumber < fn) {
//             // если ещё меньше, двигаемся вперёд
//             prevcurrent = current ;
//             current = current -> next ; }
//         else {
//             // если нашли не меньше, возвращаемся назад и останавливаемся
//             current = prevcurrent ;
//             break ; } }
//     if (current) {
//         // добавляем в середину
//         tmp -> next = current -> next ;
//         current -> next = tmp ;
//         tmp->prev = current;
//         tmp -> next -> prev = tmp ; }
//     else {
//         if (prevcurrent) {
//             // добавляем в конец
//             prevcurrent ->next = tmp ;
//             tmp -> next = NULL ;
//             tmp -> prev = prevcurrent ;
//             last = tmp ; }
//         else {
//             // добавляем в начало
//             tmp -> next = first ;
//             tmp -> prev = NULL ;
//             if (first == NULL)
//                 last = tmp ;
//             first = tmp ; } }
//     // ---
// }