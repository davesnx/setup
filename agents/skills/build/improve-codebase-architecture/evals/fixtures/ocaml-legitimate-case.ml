module type METRICS = sig
  type t = { completed : int; failed : int }
  val zero : t
  val add : t -> t -> t
  val complete : t -> t
  val fail : t -> t
  val total : t -> int
  val is_empty : t -> bool
  val format : t -> string
end

module Metrics : METRICS = struct
  type t = { completed : int; failed : int }
  let zero = { completed = 0; failed = 0 }
  let add a b =
    { completed = a.completed + b.completed; failed = a.failed + b.failed }
  let complete t = { t with completed = t.completed + 1 }
  let fail t = { t with failed = t.failed + 1 }
  let total t = t.completed + t.failed
  let is_empty t = total t = 0
  let format t = Printf.sprintf "%d complete, %d failed" t.completed t.failed
end

module Report = struct
  type outcome = Accepted of Metrics.t | Rejected of string
  let label = function
    | Accepted { Metrics.completed; failed } ->
        Printf.sprintf "%d/%d" completed (completed + failed)
    | Rejected reason -> reason
end

module type FORMAT = sig
  val display : Metrics.t -> string
end

module Make (Format : FORMAT) = struct
  let render = function
    | Report.Accepted metrics -> Format.display metrics
    | Report.Rejected reason -> reason
end

module Plain = Make (struct let display = Metrics.format end)
module Plain_alias = Plain
module Extended = struct
  include Plain_alias
  let total metrics = Metrics.total metrics
end

let rec even n = n = 0 || (n > 0 && odd (n - 1))
and odd n = n > 0 && even (n - 1)

let render_summary metrics =
  let updated = Metrics.add metrics (Metrics.complete Metrics.zero) in
  if Metrics.is_empty updated then "" else Extended.render (Report.Accepted updated)
