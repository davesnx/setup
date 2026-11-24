module Queue : sig
  type t = { mutable head : int; items : string array; mutable size : int }
  type summary = { count : int; capacity : int }
  val create : int -> t
  val items : t -> string array
  val size : t -> int
  val summary : t -> summary
end = struct
  type t = { mutable head : int; items : string array; mutable size : int }
  type summary = { count : int; capacity : int }
  let create capacity =
    if capacity <= 0 then invalid_arg "capacity must be positive";
    { head = 0; items = Array.make capacity ""; size = 0 }
  let items q = q.items
  let size q = q.size
  let summary q = { count = q.size; capacity = Array.length q.items }
end

module Dispatch = struct
  let enqueue q item =
    if Queue.size q = Array.length (Queue.items q) then Error "queue full"
    else
      let slot = (q.Queue.head + Queue.size q) mod Array.length (Queue.items q) in
      (Queue.items q).(slot) <- item;
      q.Queue.size <- q.Queue.size + 1;
      Ok ()

  let dequeue q =
    if Queue.size q = 0 then None
    else
      let item = (Queue.items q).(q.Queue.head) in
      q.Queue.head <- (q.Queue.head + 1) mod Array.length (Queue.items q);
      q.Queue.size <- q.Queue.size - 1;
      Some item

  let display_summary q =
    let { Queue.count; capacity } = Queue.summary q in
    Printf.sprintf "%d/%d" count capacity
end

module Safe_queue : sig
  type t
  type summary = { count : int; capacity : int }
  val create : int -> t
  val enqueue : t -> string -> (unit, string) result
  val dequeue : t -> string option
  val summary : t -> summary
end = struct
  type t = { mutable head : int; items : string array; mutable size : int }
  type summary = { count : int; capacity : int }

  let create capacity =
    if capacity <= 0 then invalid_arg "capacity must be positive";
    { head = 0; items = Array.make capacity ""; size = 0 }

  let enqueue q item =
    if q.size = Array.length q.items then Error "queue full"
    else
      let slot = (q.head + q.size) mod Array.length q.items in
      q.items.(slot) <- item;
      q.size <- q.size + 1;
      Ok ()

  let dequeue q =
    if q.size = 0 then None
    else
      let item = q.items.(q.head) in
      q.head <- (q.head + 1) mod Array.length q.items;
      q.size <- q.size - 1;
      Some item

  let summary q = { count = q.size; capacity = Array.length q.items }
end

module Safe_dispatch = struct
  let process q items =
    let results = List.map (Safe_queue.enqueue q) items in
    let item = Safe_queue.dequeue q in
    results, item, Safe_queue.summary q
end
